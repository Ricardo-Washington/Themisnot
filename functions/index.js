const { onCall, HttpsError } = require('firebase-functions/v1/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `O campo ${field} e obrigatorio.`);
  }
  return value.trim();
}

function teacherDisciplineIds(profile = {}) {
  const currentIds = (Array.isArray(profile.disciplinasIds) ? profile.disciplinasIds : []).map(id => {
    const separator = String(id).indexOf('::');
    return separator < 0 ? id : disciplineId(String(id).slice(separator + 2));
  });
  const legacyIds = (Array.isArray(profile.disciplinas) ? profile.disciplinas : [])
    .filter(item => item && typeof item === 'object' && item.cursoId && item.nome)
    .map(item => encodeURIComponent(String(item.nome).trim().toLocaleLowerCase('pt-BR')));
  return [...new Set([...currentIds, ...legacyIds])];
}

function disciplineId(name) {
  const rawValue = String(name || '').trim();
  const decodedValue = rawValue.includes('%') ? (() => {
    try {
      return decodeURIComponent(rawValue);
    } catch (error) {
      return rawValue;
    }
  })() : rawValue;
  return encodeURIComponent(decodedValue.toLocaleLowerCase('pt-BR'));
}

exports.createStudentAccount = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }

  const operatorSnapshot = await db.collection('usuarios').doc(context.auth.uid).get();
  const operatorRole = operatorSnapshot.data()?.atribuicao;
  if (!['funcionario', 'admin', 'adm'].includes(operatorRole)) {
    throw new HttpsError('permission-denied', 'Sem permissao para cadastrar alunos.');
  }

  const studentData = data || {};
  const email = requiredString(studentData.email, 'e-mail').toLowerCase();
  const confirmEmail = requiredString(studentData.confirmEmail, 'confirmacao do e-mail').toLowerCase();
  const password = requiredString(studentData.password, 'senha');
  const confirmPassword = requiredString(studentData.confirmPassword, 'confirmacao da senha');
  const courseId = requiredString(studentData.cursoId, 'curso');
  const classId = requiredString(studentData.turmaId, 'turma');

  if (email !== confirmEmail) {
    throw new HttpsError('invalid-argument', 'Os e-mails nao coincidem.');
  }
  if (password !== confirmPassword || password.length < 6) {
    throw new HttpsError('invalid-argument', 'As senhas devem coincidir e ter pelo menos 6 caracteres.');
  }

  const courseSnapshot = await db.collection('cursos').doc(courseId).get();
  if (!courseSnapshot.exists) {
    throw new HttpsError('not-found', 'O curso selecionado nao existe.');
  }
  const course = courseSnapshot.data() || {};
  const classItem = (Array.isArray(course.turmas) ? course.turmas : [])
    .find(item => (item.id || item.turmaId) === classId);
  if (!classItem) {
    throw new HttpsError('failed-precondition', 'Cadastre a turma no curso antes de matricular alunos.');
  }
  const dataInicio = classItem.dataInicio || course.dataInicio || '';
  const dataTermino = classItem.dataTermino || classItem.dataFim || course.dataTermino || course.dataFim || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataTermino) || dataInicio > dataTermino) {
    throw new HttpsError('failed-precondition', 'Defina datas de inicio e termino validas para a turma.');
  }

  const teachersSnapshot = await db.collection('usuarios').where('atribuicao', '==', 'professor').get();
  const teacherByDiscipline = new Map();
  teachersSnapshot.forEach(teacherDoc => {
    const teacher = teacherDoc.data() || {};
    teacherDisciplineIds(teacher).forEach(id => {
      teacherByDiscipline.set(id, [...(teacherByDiscipline.get(id) || []), teacherDoc.id]);
    });
  });
  const courseDisciplines = (Array.isArray(course.disciplinas) ? course.disciplinas : [])
    .map(item => ({ nome: typeof item === 'string' ? item : item?.nome, id: typeof item === 'string' ? disciplineId(item) : item?.id || disciplineId(item?.nome) }))
    .filter(item => item.nome && item.id);
  if (!courseDisciplines.length) {
    throw new HttpsError('failed-precondition', 'Cadastre as disciplinas do curso antes de matricular alunos.');
  }
  const disciplinas = courseDisciplines.map(subject => {
    const { nome, id } = subject;
    const professors = teacherByDiscipline.get(id) || [];
    if (professors.length !== 1) {
      throw new HttpsError('failed-precondition', `Defina o professor responsavel pela disciplina ${nome}.`);
    }
    const professorId = professors[0];
    const disciplinaKey = `${courseId}::${classId}::${nome}`;
    return { nome, disciplinaId: id, cursoId: courseId, cursoNome: course.nome || courseId, turmaId: classId, disciplinaKey, professorId };
  });
  const disciplinasKeys = disciplinas.map(item => item.disciplinaKey);
  const professoresPorDisciplina = Object.fromEntries(disciplinas.map(item => [item.disciplinaKey, item.professorId]));

  const profile = {
    nome: requiredString(studentData.nome, 'nome'),
    email,
    cpf: requiredString(studentData.cpf, 'CPF'),
    rg: requiredString(studentData.rg, 'RG'),
    orgaoRg: requiredString(studentData.orgaoRg, 'orgao expedidor'),
    endereco: requiredString(studentData.endereco, 'endereco'),
    cep: typeof studentData.cep === 'string' ? studentData.cep.trim() : '',
    logradouro: typeof studentData.logradouro === 'string' ? studentData.logradouro.trim() : '',
    numero: typeof studentData.numero === 'string' ? studentData.numero.trim() : '',
    bairro: typeof studentData.bairro === 'string' ? studentData.bairro.trim() : '',
    cidade: typeof studentData.cidade === 'string' ? studentData.cidade.trim() : '',
    uf: typeof studentData.uf === 'string' ? studentData.uf.trim().toUpperCase() : '',
    telefone: requiredString(studentData.telefone, 'telefone'),
    telefoneAlt: typeof studentData.telefoneAlt === 'string' ? studentData.telefoneAlt.trim() : '',
    formaPagamento: typeof studentData.formaPagamento === 'string' ? studentData.formaPagamento.trim() : '',
    nascimento: typeof studentData.nascimento === 'string' ? studentData.nascimento.trim() : '',
    cursoId,
    cursoSolicitado: course.nome || courseId,
    turmaId: classId,
    disciplinas,
    disciplinasKeys,
    professoresPorDisciplina,
    dataInicio,
    dataTermino,
    turno: classItem.turno || (typeof studentData.turno === 'string' ? studentData.turno.trim() : ''),
    idade: requiredString(String(studentData.idade ?? ''), 'idade'),
    atribuicao: 'aluno',
    createdAt: FieldValue.serverTimestamp(),
    dataCadastro: FieldValue.serverTimestamp(),
    cadastradoPor: context.auth.uid
  };

  let createdUser;
  try {
    createdUser = await getAuth().createUser({ email, password });
    const batch = db.batch();
    batch.set(db.collection('usuarios').doc(createdUser.uid), {
      ...profile,
      rosterAtualizadoEm: FieldValue.serverTimestamp()
    });
    disciplinas.forEach(discipline => {
      const rosterId = encodeURIComponent(`${createdUser.uid}::${discipline.disciplinaKey}`);
      batch.set(db.collection('matriculas_disciplina').doc(rosterId), {
        alunoId: createdUser.uid,
        alunoNome: profile.nome,
        professorId: discipline.professorId,
        cursoId: discipline.cursoId,
        cursoNome: discipline.cursoNome,
        turmaId: discipline.turmaId,
        disciplinaId: discipline.disciplinaId,
        disciplinaKey: discipline.disciplinaKey,
        disciplinaNome: discipline.nome
      });
    });
    await batch.commit();
  } catch (error) {
    if (createdUser) {
      await getAuth().deleteUser(createdUser.uid).catch(() => {});
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail ja esta cadastrado.');
    }
    console.error('Erro ao criar conta de aluno:', error);
    throw new HttpsError('internal', 'Nao foi possivel cadastrar o aluno.');
  }

  return { uid: createdUser.uid };
});

exports.createTeacherAccount = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }
  const operatorSnapshot = await db.collection('usuarios').doc(context.auth.uid).get();
  const operatorRole = operatorSnapshot.data()?.atribuicao;
  if (!['funcionario', 'admin', 'adm'].includes(operatorRole)) {
    throw new HttpsError('permission-denied', 'Sem permissao para cadastrar professores.');
  }

  const teacherData = data || {};
  const nome = requiredString(teacherData.nome, 'nome');
  const email = requiredString(teacherData.email, 'e-mail').toLowerCase();
  const password = requiredString(teacherData.password, 'senha');
  const disciplinasIds = [...new Set(Array.isArray(teacherData.disciplinasIds) ? teacherData.disciplinasIds : [])];
  if (!email.includes('@') || password.length < 6 || !disciplinasIds.length || disciplinasIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new HttpsError('invalid-argument', 'Informe e-mail, senha e disciplinas validas.');
  }

  const [teachersSnapshot, disciplinesSnapshot] = await Promise.all([
    db.collection('usuarios').where('atribuicao', '==', 'professor').get(),
    db.collection('disciplinas').get()
  ]);
  const currentAssignments = new Set();
  teachersSnapshot.forEach(doc => teacherDisciplineIds(doc.data()).forEach(id => currentAssignments.add(id)));
  if (disciplinasIds.some(id => currentAssignments.has(id))) {
    throw new HttpsError('failed-precondition', 'Uma ou mais disciplinas ja possuem professor responsavel.');
  }
  const disciplineIdsInCatalog = new Set(disciplinesSnapshot.docs.filter(doc => (doc.data().cursoIds || []).length).map(doc => doc.id));
  const invalid = disciplinasIds.some(id => !disciplineIdsInCatalog.has(id));
  if (invalid) {
    throw new HttpsError('invalid-argument', 'Uma ou mais disciplinas nao pertencem ao catalogo de cursos.');
  }

  let createdUser;
  try {
    createdUser = await getAuth().createUser({ email, password, displayName: nome });
    await db.collection('usuarios').doc(createdUser.uid).set({
      nome,
      email,
      atribuicao: 'professor',
      disciplinasIds,
      createdAt: FieldValue.serverTimestamp(),
      cadastradoPor: context.auth.uid
    });
  } catch (error) {
    if (createdUser) await getAuth().deleteUser(createdUser.uid).catch(() => {});
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail ja esta cadastrado.');
    }
    console.error('Erro ao criar conta de professor:', error);
    throw new HttpsError('internal', 'Nao foi possivel cadastrar o professor.');
  }

  return { uid: createdUser.uid };
});

exports.updateTeacherAssignments = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }
  const operatorSnapshot = await db.collection('usuarios').doc(context.auth.uid).get();
  if (!['funcionario', 'admin', 'adm'].includes(operatorSnapshot.data()?.atribuicao)) {
    throw new HttpsError('permission-denied', 'Sem permissao para alterar disciplinas de professores.');
  }
  const teacherId = requiredString(data?.teacherId, 'professor');
  const teacherRef = db.collection('usuarios').doc(teacherId);
  const teacherSnapshot = await teacherRef.get();
  if (!teacherSnapshot.exists || teacherSnapshot.data().atribuicao !== 'professor') {
    throw new HttpsError('not-found', 'Professor nao encontrado.');
  }
  const disciplinasIds = [...new Set(Array.isArray(data?.disciplinasIds) ? data.disciplinasIds : [])];
  if (!disciplinasIds.length || disciplinasIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new HttpsError('invalid-argument', 'Selecione disciplinas validas.');
  }
  const [teachersSnapshot, disciplinesSnapshot] = await Promise.all([
    db.collection('usuarios').where('atribuicao', '==', 'professor').get(),
    db.collection('disciplinas').get()
  ]);
  const currentAssignments = new Set();
  teachersSnapshot.forEach(doc => {
    if (doc.id !== teacherId) teacherDisciplineIds(doc.data()).forEach(id => currentAssignments.add(id));
  });
  if (disciplinasIds.some(id => currentAssignments.has(id))) {
    throw new HttpsError('failed-precondition', 'Uma ou mais disciplinas ja possuem outro professor responsavel.');
  }
  const disciplineIdsInCatalog = new Set(disciplinesSnapshot.docs.filter(doc => (doc.data().cursoIds || []).length).map(doc => doc.id));
  const invalid = disciplinasIds.some(id => !disciplineIdsInCatalog.has(id));
  if (invalid) {
    throw new HttpsError('invalid-argument', 'Uma ou mais disciplinas nao pertencem ao catalogo de cursos.');
  }
  await teacherRef.update({
    disciplinasIds,
    disciplinas: FieldValue.delete(),
    disciplinasKeys: FieldValue.delete()
  });
  return { disciplinasIds };
});

exports.submitTeacherAvailability = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }
  const professorRef = db.collection('usuarios').doc(context.auth.uid);
  const professorSnapshot = await professorRef.get();
  const professor = professorSnapshot.data() || {};
  if (professor.atribuicao !== 'professor') {
    throw new HttpsError('permission-denied', 'Somente professores podem informar disponibilidade.');
  }

  const notificationId = requiredString(data?.notificationId, 'solicitacao');
  const days = data?.diasSemana;
  const startTime = data?.horarioInicio;
  const endTime = data?.horarioTermino;
  if (!Array.isArray(days) || !days.length || days.length > 7 || days.some(day => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new HttpsError('invalid-argument', 'Selecione dias validos para as aulas.');
  }
  const uniqueDays = [...new Set(days)];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '')
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '')
    || startTime >= endTime) {
    throw new HttpsError('invalid-argument', 'Informe uma faixa de horario valida.');
  }
  const notificationRef = db.collection('notificacoes').doc(notificationId);
  const availabilityRef = db.collection('disponibilidades').doc(encodeURIComponent(notificationId));
  await db.runTransaction(async transaction => {
    const notificationSnapshot = await transaction.get(notificationRef);
    if (!notificationSnapshot.exists) {
      throw new HttpsError('not-found', 'Solicitacao de disponibilidade nao encontrada.');
    }
    const notification = notificationSnapshot.data();
    const assignmentDisciplineId = notification.disciplinaId;
    if (notification.professorId !== context.auth.uid
      || notification.status !== 'pendente'
      || !teacherDisciplineIds(professor).includes(assignmentDisciplineId)) {
      throw new HttpsError('permission-denied', 'Esta solicitacao nao pertence ao seu perfil.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(notification.dataInicio || '')
      || !/^\d{4}-\d{2}-\d{2}$/.test(notification.dataTermino || '')
      || notification.dataInicio > notification.dataTermino) {
      throw new HttpsError('failed-precondition', 'O periodo da solicitacao de disponibilidade e invalido.');
    }

    transaction.set(availabilityRef, {
      professorId: context.auth.uid,
      cursoId: notification.cursoId,
      cursoNome: notification.cursoNome,
      turmaId: notification.turmaId || '',
      disciplinaId: assignmentDisciplineId,
      disciplinaNome: notification.disciplinaNome,
      disciplinaKey: notification.disciplinaKey,
      dataInicio: notification.dataInicio,
      dataTermino: notification.dataTermino,
      diasSemana: uniqueDays,
      horarioInicio: startTime,
      horarioTermino: endTime,
      status: 'aguardando_adm',
      atualizadoEm: FieldValue.serverTimestamp()
    });
    transaction.update(notificationRef, {
      status: 'respondida',
      respondidaEm: FieldValue.serverTimestamp()
    });
  });

  return { saved: true };
});

function availabilityIsApproved(record) {
  return !record.status || record.status === 'aprovada';
}

function availabilitySlotsOverlap(first, second) {
  const sameCourse = first.cursoId === second.cursoId;
  const dateRangesOverlap = first.dataInicio <= second.dataTermino && first.dataTermino >= second.dataInicio;
  const sharesDay = (first.diasSemana || []).some(day => (second.diasSemana || []).includes(day));
  const timeOverlaps = first.horarioInicio < second.horarioTermino && first.horarioTermino > second.horarioInicio;
  return sameCourse && dateRangesOverlap && sharesDay && timeOverlaps;
}

exports.reviewTeacherAvailability = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }
  const adminSnapshot = await db.collection('usuarios').doc(context.auth.uid).get();
  if (!['adm', 'admin'].includes(adminSnapshot.data()?.atribuicao)) {
    throw new HttpsError('permission-denied', 'Somente o ADM pode revisar disponibilidades.');
  }

  const availabilityId = requiredString(data?.availabilityId, 'disponibilidade');
  const action = data?.action;
  if (!['save', 'approve'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Acao de revisao invalida.');
  }
  const days = data?.diasSemana;
  const startTime = data?.horarioInicio;
  const endTime = data?.horarioTermino;
  const startDate = data?.dataInicio;
  const endDate = data?.dataTermino;
  if (!Array.isArray(days) || !days.length || days.length > 7 || days.some(day => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new HttpsError('invalid-argument', 'Selecione dias validos para as aulas.');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '')
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '')
    || startTime >= endTime) {
    throw new HttpsError('invalid-argument', 'Informe uma faixa de horario valida.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '')
    || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || '')
    || startDate > endDate) {
    throw new HttpsError('invalid-argument', 'Informe um periodo de datas valido.');
  }

  const availabilityRef = db.collection('disponibilidades').doc(availabilityId);
  await db.runTransaction(async transaction => {
    const availabilitySnapshot = await transaction.get(availabilityRef);
    if (!availabilitySnapshot.exists) {
      throw new HttpsError('not-found', 'Disponibilidade nao encontrada.');
    }
    const current = availabilitySnapshot.data();
    if (typeof current.cursoId !== 'string' || !current.cursoId) {
      throw new HttpsError('failed-precondition', 'Esta disponibilidade nao esta vinculada a um curso.');
    }
    const approved = action === 'approve' || availabilityIsApproved(current);
    const updated = {
      ...current,
      dataInicio: startDate,
      dataTermino: endDate,
      diasSemana: [...new Set(days)],
      horarioInicio: startTime,
      horarioTermino: endTime
    };

    if (approved) {
      const courseAvailabilities = await transaction.get(
        db.collection('disponibilidades').where('cursoId', '==', current.cursoId)
      );
      const conflict = courseAvailabilities.docs.some(doc => {
        if (doc.id === availabilityId) return false;
        const existing = doc.data();
        return availabilityIsApproved(existing) && availabilitySlotsOverlap(updated, existing);
      });
      if (conflict) {
        throw new HttpsError('failed-precondition', 'Este horario conflita com outra disponibilidade aprovada para a mesma turma.');
      }
    }

    transaction.update(availabilityRef, {
      dataInicio: startDate,
      dataTermino: endDate,
      diasSemana: [...new Set(days)],
      horarioInicio: startTime,
      horarioTermino: endTime,
      status: approved ? 'aprovada' : 'aguardando_adm',
      atualizadoEm: FieldValue.serverTimestamp(),
      revisadoEm: FieldValue.serverTimestamp(),
      revisadoPor: context.auth.uid
    });
  });

  return { saved: true, approved: action === 'approve' };
});