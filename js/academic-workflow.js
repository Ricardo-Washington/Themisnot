(function () {
  function disciplineKey(courseId, classId, name) {
    return `${courseId}::${classId || 'sem-turma'}::${name}`;
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

  function subjectId(subject) {
    return subject && typeof subject === 'object' && subject.id
      ? subject.id
      : disciplineId(typeof subject === 'string' ? subject : subject?.nome);
  }

  async function ensureCourseDisciplineRecords(db, courses) {
    const batch = db.batch();
    const existingSnapshot = await db.collection('disciplinas').get();
    const existing = new Map(existingSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const pending = new Map();

    courses.forEach(course => {
      const subjects = (Array.isArray(course.disciplinas) ? course.disciplinas : [])
        .map(subject => ({ id: subjectId(subject), nome: typeof subject === 'string' ? subject : subject?.nome }))
        .filter(subject => subject.id && subject.nome);
      const uniqueSubjects = [...new Map(subjects.map(subject => [subject.id, subject])).values()];
      uniqueSubjects.forEach(subject => {
        const record = existing.get(subject.id) || pending.get(subject.id) || { nome: subject.nome, cursoIds: [] };
        pending.set(subject.id, {
          ...record,
          nome: record.nome || subject.nome,
          cursoIds: [...new Set([...(record.cursoIds || []), course.id])]
        });
      });
      batch.update(db.collection('cursos').doc(course.id), { disciplinas: uniqueSubjects });
    });

    pending.forEach((record, id) => batch.set(db.collection('disciplinas').doc(id), record, { merge: true }));
    if (pending.size || courses.length) await batch.commit();
  }

  async function linkDisciplineToCourses(db, name, courseIds) {
    const id = disciplineId(name);
    const selectedCourseIds = [...new Set(courseIds)];
    const [disciplineSnapshot, ...courseSnapshots] = await Promise.all([
      db.collection('disciplinas').doc(id).get(),
      ...selectedCourseIds.map(courseId => db.collection('cursos').doc(courseId).get())
    ]);
    if (!selectedCourseIds.length || courseSnapshots.some(snapshot => !snapshot.exists)) {
      throw new Error('Selecione ao menos um curso cadastrado.');
    }

    const batch = db.batch();
    const disciplineRef = db.collection('disciplinas').doc(id);
    const linkedCourseIds = [...new Set([...(disciplineSnapshot.data()?.cursoIds || []), ...selectedCourseIds])];
    batch.set(disciplineRef, {
      nome: name.trim(),
      cursoIds: linkedCourseIds,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    courseSnapshots.forEach(snapshot => {
      const course = snapshot.data() || {};
      const subjects = Array.isArray(course.disciplinas) ? course.disciplinas : [];
      const linked = new Map(subjects.map(subject => [subjectId(subject), {
        id: subjectId(subject),
        nome: typeof subject === 'string' ? subject : subject?.nome
      }]));
      linked.set(id, { id, nome: name.trim() });
      batch.update(snapshot.ref, { disciplinas: [...linked.values()] });
    });
    await batch.commit();
    return { id, nome: name.trim(), cursoIds: linkedCourseIds };
  }

  function normalizeAssignment(item) {
    if (typeof item === 'string') return { nome: item, cursoId: '', turmaId: '' };
    return {
      nome: item?.nome || item?.disciplinaNome || item?.disciplina || '',
      cursoId: item?.cursoId || item?.idCurso || '',
      turmaId: item?.turmaId || item?.idTurma || ''
    };
  }

  function teacherDisciplineIds(profile) {
    const currentIds = (Array.isArray(profile.disciplinasIds) ? profile.disciplinasIds : []).map(id => {
      const separator = String(id).indexOf('::');
      return separator < 0 ? id : disciplineId(String(id).slice(separator + 2));
    });
    const legacyIds = (Array.isArray(profile.disciplinas) ? profile.disciplinas : [])
      .map(normalizeAssignment)
      .filter(item => item.cursoId && item.nome)
      .map(item => disciplineId(item.nome));
    return [...new Set([...currentIds, ...legacyIds])];
  }

  async function notifyCourseProfessors(db, courseId, course) {
    const snapshot = await db.collection('usuarios').where('atribuicao', '==', 'professor').get();
    const writes = [];
    const expectedNotificationIds = new Set();

    snapshot.forEach(professorDoc => {
      const professor = professorDoc.data() || {};
      const assignedIds = teacherDisciplineIds(professor);
      const classes = Array.isArray(course.turmas) && course.turmas.length ? course.turmas : [{ id: '' }];
      (Array.isArray(course.disciplinas) ? course.disciplinas : []).forEach(subject => {
        const name = typeof subject === 'string' ? subject : subject?.nome;
        const id = subjectId(subject);
        if (!name || !assignedIds.includes(id)) return;
        classes.forEach(classItem => {
          if (classItem.status === 'finalizada') return;
          const classId = classItem.id || classItem.turmaId || '';
          const dataInicio = classItem.dataInicio || course.dataInicio || '';
          const dataTermino = classItem.dataTermino || classItem.dataFim || course.dataTermino || course.dataFim || '';
          if (!dataInicio || !dataTermino || dataTermino < dataInicio) return;
          const key = disciplineKey(courseId, classId, name);
          const notificationId = encodeURIComponent(`${professorDoc.id}::${key}`);
          expectedNotificationIds.add(notificationId);
          const ref = db.collection('notificacoes').doc(notificationId);
          writes.push(ref.get().then(notificationDoc => {
            if (notificationDoc.exists && notificationDoc.data().status !== 'cancelada') return;
            return ref.set({
              tipo: 'solicitar_disponibilidade',
              destinatarioId: professorDoc.id,
              professorId: professorDoc.id,
              cursoId: courseId,
              cursoNome: course.nome || courseId,
              turmaId: classId,
              disciplinaNome: name,
              disciplinaId: id,
              disciplinaKey: key,
              dataInicio,
              dataTermino,
              status: 'pendente',
              criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
          }));
        });
      });
    });

    await Promise.all(writes);
    const existingRequests = await db.collection('notificacoes').where('cursoId', '==', courseId).get();
    const cancellations = existingRequests.docs
      .filter(doc => doc.data().tipo === 'solicitar_disponibilidade'
        && doc.data().status === 'pendente'
        && !expectedNotificationIds.has(doc.id))
      .map(doc => doc.ref.update({ status: 'cancelada' }));
    await Promise.all(cancellations);
    return writes.length;
  }

  async function buildStudentDisciplineLinks(db, course, classId) {
    const snapshot = await db.collection('usuarios').where('atribuicao', '==', 'professor').get();
    const teachers = [];
    snapshot.forEach(professorDoc => {
      const profile = professorDoc.data() || {};
      teachers.push({ id: professorDoc.id, disciplineIds: teacherDisciplineIds(profile) });
    });

    const disciplines = (Array.isArray(course.disciplinas) ? course.disciplinas : [])
      .filter(item => typeof item === 'string' ? item : item?.nome)
      .map(subject => {
        const name = typeof subject === 'string' ? subject : subject.nome;
        const id = subjectId(subject);
        const assignedTeachers = teachers.filter(teacher => teacher.disciplineIds.includes(id));
        const teacher = assignedTeachers.length === 1 ? assignedTeachers[0] : null;
        const key = disciplineKey(course.id, classId, name);
        return {
          nome: name,
          disciplinaId: id,
          cursoId: course.id,
          cursoNome: course.nome || course.id,
          turmaId: classId || '',
          disciplinaKey: key,
          professorId: teacher?.id || ''
        };
      });

    return {
      disciplines,
      missing: disciplines.length ? disciplines.filter(item => !item.professorId).map(item => item.nome) : ['Nenhuma disciplina cadastrada']
    };
  }

  async function findDisciplineAssignmentConflicts(db, disciplineIds, currentProfessorId = '') {
    const snapshot = await db.collection('usuarios').where('atribuicao', '==', 'professor').get();
    const selected = new Set(disciplineIds);
    const conflicts = new Set();
    snapshot.forEach(doc => {
      if (doc.id === currentProfessorId) return;
      teacherDisciplineIds(doc.data()).forEach(id => {
        if (selected.has(id)) conflicts.add(decodeURIComponent(id));
      });
    });
    return [...conflicts];
  }

  async function syncStudentRosters(db, studentId, student) {
    const rosterCollection = db.collection('matriculas_disciplina');
    const existing = await rosterCollection.where('alunoId', '==', studentId).get();
    const batch = db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    const disciplines = Array.isArray(student.disciplinas) ? student.disciplinas : [];
    disciplines.filter(item => item.professorId && item.disciplinaKey).forEach(item => {
      const rosterId = encodeURIComponent(`${studentId}::${item.disciplinaKey}`);
      batch.set(rosterCollection.doc(rosterId), {
        alunoId: studentId,
        alunoNome: student.nome || 'Aluno',
        professorId: item.professorId,
        cursoId: item.cursoId,
        cursoNome: item.cursoNome || '',
        turmaId: item.turmaId || '',
        disciplinaId: item.disciplinaId,
        disciplinaKey: item.disciplinaKey,
        disciplinaNome: item.nome
      });
    });
    batch.update(db.collection('usuarios').doc(studentId), {
      rosterAtualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  }

  async function syncCourseStudentTeachers(db, courseId) {
    const [courseDoc, studentsSnapshot, teachersSnapshot] = await Promise.all([
      db.collection('cursos').doc(courseId).get(),
      db.collection('usuarios').where('cursoId', '==', courseId).get(),
      db.collection('usuarios').where('atribuicao', '==', 'professor').get()
    ]);
    if (!courseDoc.exists) return;
    const course = { id: courseDoc.id, ...courseDoc.data() };
    const teachers = [];
    teachersSnapshot.forEach(doc => teachers.push({
      id: doc.id,
      disciplineIds: teacherDisciplineIds(doc.data())
    }));
    await Promise.all(studentsSnapshot.docs.filter(doc => ['aluno', 'Aluno'].includes(doc.data().atribuicao)).map(async studentDoc => {
      const student = studentDoc.data() || {};
      const classId = student.turmaId || '';
      const disciplines = (Array.isArray(course.disciplinas) ? course.disciplinas : [])
        .filter(item => typeof item === 'string' ? item : item?.nome)
        .map(subject => {
          const name = typeof subject === 'string' ? subject : subject.nome;
          const id = subjectId(subject);
          const matches = teachers.filter(teacher => teacher.disciplineIds.includes(id));
          return {
            nome: name,
            disciplinaId: id,
            cursoId: courseId,
            cursoNome: course.nome || courseId,
            turmaId: classId,
            disciplinaKey: disciplineKey(courseId, classId, name),
            professorId: matches.length === 1 ? matches[0].id : ''
          };
        });
      const profileUpdate = {
        disciplinas: disciplines,
        disciplinasKeys: disciplines.map(item => item.disciplinaKey),
        professoresPorDisciplina: Object.fromEntries(disciplines.map(item => [item.disciplinaKey, item.professorId]))
      };
      await studentDoc.ref.update(profileUpdate);
      await syncStudentRosters(db, studentDoc.id, { ...student, ...profileUpdate });
    }));
  }

  window.academicWorkflow = { disciplineId, disciplineKey, subjectId, ensureCourseDisciplineRecords, linkDisciplineToCourses, notifyCourseProfessors, buildStudentDisciplineLinks, findDisciplineAssignmentConflicts, syncStudentRosters, syncCourseStudentTeachers };
})();