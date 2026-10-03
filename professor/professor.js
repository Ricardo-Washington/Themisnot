const firebaseConfig = {
    apiKey: 'AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc',
    authDomain: 'themis-154d1.firebaseapp.com',
    projectId: 'themis-154d1',
    storageBucket: 'themis-154d1.firebasestorage.app',
    messagingSenderId: '1017306886601',
    appId: '1:1017306886601:web:3b7f5057515d244c2bb818'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let professorId = '';
let professorPerfil = {};
let assignments = [];
let courses = [];
let students = [];
let gradeRecords = {};
let selectedAssignment = null;
let professorDisciplinasIds = [];
let availabilityRecords = [];
let availabilityRequests = [];

function normalizarDisciplinasProfessor(perfil) {
    const rawValues = [
        ...(Array.isArray(perfil.disciplinasIds) ? perfil.disciplinasIds : []),
        ...(Array.isArray(perfil.disciplinas) ? perfil.disciplinas : [])
    ];

    const ids = rawValues
        .map(value => {
            if (value == null) return '';
            if (typeof value === 'object') {
                if (value.id) return String(value.id);
                const nome = value.nome || value.disciplinaNome || value.disciplina || value.name;
                return nome ? window.academicWorkflow.disciplineId(String(nome)) : '';
            }

            const texto = String(value).trim();
            if (!texto) return '';
            if (texto.includes('::')) {
                const partes = texto.split('::');
                const nome = partes[partes.length - 1];
                return nome ? window.academicWorkflow.disciplineId(String(nome)) : '';
            }

            return window.academicWorkflow.disciplineId(texto);
        })
        .filter(Boolean);

    return [...new Set(ids)];
}

firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = '/login/login.html';
        return;
    }

    try {
        const professorDoc = await db.collection('usuarios').doc(user.uid).get();
        const professor = professorDoc.data() || {};
        if (professor.atribuicao !== 'professor') {
            window.location.href = '/home/home.html';
            return;
        }

        professorId = user.uid;
        professorPerfil = professor;
        const primeiroNome = String(professor.nome || user.email || 'professor').split(' ')[0];
        document.getElementById('teacher-name').textContent = primeiroNome;
        document.getElementById('teacher-greeting').textContent = `Olá, ${primeiroNome}`;
        professorDisciplinasIds = normalizarDisciplinasProfessor(professor);
        await carregarDadosAcademicos();
    } catch (error) {
        console.error('Erro ao carregar área do professor:', error);
        mostrarErro('Não foi possível carregar os dados acadêmicos.');
    }
});

async function carregarDadosAcademicos() {
    const [coursesSnapshot, rosterSnapshot, gradesSnapshot, availabilitySnapshot, requestsSnapshot] = await Promise.all([
        db.collection('cursos').get(),
        db.collection('matriculas_disciplina').where('professorId', '==', professorId).get(),
        db.collection('boletins').where('professorId', '==', professorId).get(),
        db.collection('disponibilidades').where('professorId', '==', professorId).get(),
        db.collection('notificacoes').where('professorId', '==', professorId).get()
    ]);

    courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const idsDasMatriculas = rosterSnapshot.docs
        .map(doc => doc.data())
        .filter(item => item && item.professorId === professorId && item.disciplinaKey)
        .map(item => {
            const partes = String(item.disciplinaKey).split('::');
            const nomeDisciplina = partes.slice(2).join('::');
            return nomeDisciplina ? window.academicWorkflow.disciplineId(nomeDisciplina) : '';
        })
        .filter(Boolean);

    professorDisciplinasIds = [...new Set([...professorDisciplinasIds, ...normalizarDisciplinasProfessor(professorPerfil), ...idsDasMatriculas])];
    assignments = reconstruirDisciplinasPorIds(professorDisciplinasIds);
    students = rosterSnapshot.docs.map(doc => ({ id: doc.data().alunoId, ...doc.data() }));
    gradeRecords = {};
    gradesSnapshot.forEach(doc => {
        gradeRecords[doc.id] = { id: doc.id, ...doc.data() };
    });
    availabilityRecords = availabilitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    availabilityRequests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(request => request.tipo === 'solicitar_disponibilidade'
            && request.status === 'pendente'
            && !availabilityRecords.some(record =>
                record.id === request.id || record.disciplinaKey === request.disciplinaKey
            ));

    assignments = assignments.map(assignment => enriquecerDisciplina(assignment));
    renderizarResumo();
    renderizarSolicitacoesDisponibilidade();
    renderizarDisciplinas();
}

function reconstruirDisciplinasPorIds(ids) {
    return ids.flatMap(id => courses.flatMap(course => {
        const subject = (course.disciplinas || []).find(item => window.academicWorkflow.subjectId(item) === id);
        if (!subject) return [];
        const nome = typeof subject === 'string' ? subject : subject.nome;
        const classes = Array.isArray(course.turmas) && course.turmas.length ? course.turmas : [{ id: '' }];
        return classes.map(classItem => ({
            cursoId: course.id,
            cursoNome: course.nome || course.id,
            nome,
            disciplinaId: id,
            turmaId: classItem.id || classItem.turmaId || '',
            dataInicio: classItem.dataInicio || course.dataInicio || '',
            dataTermino: classItem.dataTermino || classItem.dataFim || course.dataTermino || course.dataFim || '',
            turno: classItem.turno || course.turno || ''
        }));
    }));
}

function obterPeriodoDoCurso(curso) {
    const periodo = (curso?.periodo || curso?.turno || '').toString().trim().toLowerCase();
    if (periodo.includes('not')) return 'noturno';
    if (periodo.includes('dia')) return 'diurno';
    return 'diurno';
}

function obterDiasPermitidosDoCurso(curso) {
    return obterPeriodoDoCurso(curso) === 'noturno' ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
}

function obterHorarioPermitido(curso) {
    const periodo = obterPeriodoDoCurso(curso);
    if (periodo === 'noturno') {
        return { inicio: '18:00', termino: '22:00' };
    }
    return { inicio: '08:00', termino: '18:00' };
}

function renderizarSolicitacoesDisponibilidade() {
    const container = document.getElementById('availability-request-list');
    container.textContent = '';
    if (!availabilityRequests.length && !availabilityRecords.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Nenhuma solicitação de disponibilidade pendente.';
        container.appendChild(empty);
    }

    const nomesDias = ['', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    availabilityRecords.forEach(record => {
        const confirmation = document.createElement('div');
        const approved = record.status === 'aprovada' || !record.status;
        confirmation.className = approved ? 'availability-confirmed' : 'availability-pending';
        const days = (record.diasSemana || []).map(day => nomesDias[day]).filter(Boolean).join(', ');
        const status = approved ? 'Aprovada pelo ADM' : 'Aguardando revisão do ADM';
        confirmation.textContent = `${status} · ${record.cursoNome || 'Curso'} · ${record.disciplinaNome || 'Disciplina'}: ${days}, ${record.horarioInicio} às ${record.horarioTermino} (${record.dataInicio} até ${record.dataTermino})`;
        container.appendChild(confirmation);
    });
    if (!availabilityRequests.length) return;

    const dias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    availabilityRequests.forEach(request => {
        const course = courses.find(item => item.id === request.cursoId || item.nome === request.cursoNome) || {};
        const saved = availabilityRecords.find(item => item.disciplinaKey === request.disciplinaKey) || {};
        const diasPermitidos = obterDiasPermitidosDoCurso(course);
        const horarioPermitido = obterHorarioPermitido(course);
        const card = document.createElement('article');
        card.className = 'availability-card';
        card.innerHTML = `<div class="availability-card-heading"><div><span class="card-kicker">${escapeHtml(request.cursoNome || 'Curso')}</span><h3>${escapeHtml(request.disciplinaNome || 'Disciplina')}</h3><p>Turma ${escapeHtml(request.turmaId || 'sem identificação')} · ${escapeHtml(request.dataInicio || '')} até ${escapeHtml(request.dataTermino || '')}</p></div></div><form class="availability-form" data-request-id="${escapeHtml(request.id)}"><fieldset><legend>Dias disponíveis</legend><div class="availability-days">${dias.map((dia, index) => {
            const permitido = diasPermitidos.includes(index + 1);
            return `<label><input type="checkbox" name="diaSemana" value="${index + 1}" ${saved.diasSemana?.includes(index + 1) ? 'checked' : ''} ${permitido ? '' : 'disabled'}><span>${dia}</span></label>`;
        }).join('')}</div></fieldset><div class="availability-times"><label>Início <input type="time" name="inicio" value="${escapeHtml(saved.horarioInicio || horarioPermitido.inicio)}" min="${horarioPermitido.inicio}" max="${horarioPermitido.termino}" required></label><label>Término <input type="time" name="termino" value="${escapeHtml(saved.horarioTermino || horarioPermitido.termino)}" min="${horarioPermitido.inicio}" max="${horarioPermitido.termino}" required></label><button class="outline-button" type="submit"><i class="fa-solid fa-calendar-check"></i> Confirmar disponibilidade</button></div><p class="availability-feedback" aria-live="polite"></p></form>`;
        card.querySelector('form').addEventListener('submit', event => salvarDisponibilidade(event, request));
        container.appendChild(card);
    });
}

async function salvarDisponibilidade(event, request) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = form.querySelector('.availability-feedback');
    const diasSemana = Array.from(form.querySelectorAll('input[name="diaSemana"]:checked')).map(input => Number(input.value));
    const horarioInicio = form.elements.inicio.value;
    const horarioTermino = form.elements.termino.value;
    feedback.className = 'availability-feedback';
    feedback.textContent = '';

    if (!diasSemana.length || !horarioInicio || !horarioTermino || horarioInicio >= horarioTermino) {
        feedback.classList.add('warning');
        feedback.textContent = 'Selecione ao menos um dia e informe uma faixa de horário válida.';
        return;
    }

    try {
        const notificationRef = db.collection('notificacoes').doc(request.id);
        const availabilityRef = db.collection('disponibilidades').doc(request.id);
        await db.runTransaction(async transaction => {
            const notificationSnapshot = await transaction.get(notificationRef);
            if (!notificationSnapshot.exists
                || notificationSnapshot.data().professorId !== professorId
                || notificationSnapshot.data().status !== 'pendente') {
                throw new Error('Esta solicitação não está mais disponível para confirmação.');
            }

            const notification = notificationSnapshot.data();
            transaction.set(availabilityRef, {
                professorId,
                cursoId: notification.cursoId,
                cursoNome: notification.cursoNome,
                turmaId: notification.turmaId || '',
                disciplinaId: notification.disciplinaId,
                disciplinaNome: notification.disciplinaNome,
                disciplinaKey: notification.disciplinaKey,
                dataInicio: notification.dataInicio,
                dataTermino: notification.dataTermino,
                diasSemana: [...new Set(diasSemana)],
                horarioInicio,
                horarioTermino,
                status: 'aguardando_adm',
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        const data = {
            ...request,
            id: request.id,
            professorId,
            diasSemana,
            horarioInicio,
            horarioTermino,
            status: 'aguardando_adm'
        };
        availabilityRecords = [...availabilityRecords.filter(item => item.id !== data.id), data];
        availabilityRequests = availabilityRequests.filter(item => item.id !== request.id);
        renderizarSolicitacoesDisponibilidade();
        feedback.classList.add('success');
        feedback.textContent = 'Disponibilidade registrada e enviada ao ADM para revisão.';
    } catch (error) {
        console.error('Erro ao salvar disponibilidade:', error);
        feedback.classList.add('warning');
        feedback.textContent = error.message || 'Não foi possível registrar a disponibilidade. Atualize a página e tente novamente.';
    }
}

function enriquecerDisciplina(assignment) {
    const course = courses.find(item => item.id === assignment.cursoId || item.nome === assignment.cursoNome);
    const turma = (course?.turmas || []).find(item => item.id === assignment.turmaId || item.turmaId === assignment.turmaId);
    const courseName = assignment.cursoNome || course?.nome || 'Curso não identificado';
    const turmaId = assignment.turmaId || turma?.id || turma?.turmaId || course?.turmaId || '';
    const courseDate = assignment.dataInicio || turma?.dataInicio || course?.dataInicio || course?.dataTurma || course?.proximaTurma || 'Data a definir';
    const endDate = assignment.dataTermino || turma?.dataTermino || turma?.dataFim || course?.dataTermino || course?.dataFim || 'Data a definir';
    const shift = assignment.turno || turma?.turno || course?.turno || '';
    const day = assignment.diaSemana || assignment.dia || course?.diaSemana || course?.dia || '';
    const time = assignment.horario || turma?.horario || course?.horario || '';
    const key = `${assignment.cursoId || course?.id || courseName}::${turmaId || 'sem-turma'}::${assignment.nome}`;
    return { ...assignment, key, cursoId: assignment.cursoId || course?.id || '', cursoNome: courseName, turmaId, dataCurso: courseDate, dataTermino: endDate, turno: shift, diaSemana: day, horario: time };
}

function renderizarResumo() {
    const studentsCount = new Set(assignments.flatMap(assignment => estudantesDaDisciplina(assignment).map(student => student.id))).size;
    document.getElementById('discipline-total').textContent = assignments.length;
    document.getElementById('student-total').textContent = studentsCount;
    document.getElementById('next-class').textContent = assignments[0]?.diaSemana || '--';
}

function renderizarDisciplinas() {
    const grid = document.getElementById('discipline-grid');
    grid.textContent = '';
    if (!assignments.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Nenhuma disciplina foi vinculada ao seu perfil ainda.';
        grid.appendChild(empty);
        return;
    }

    const cursosAgrupados = new Map();
    assignments.forEach(assignment => {
        const key = assignment.cursoId || assignment.cursoNome;
        const itens = cursosAgrupados.get(key) || [];
        itens.push(assignment);
        cursosAgrupados.set(key, itens);
    });

    const cursos = [...cursosAgrupados.entries()];
    const tabs = document.createElement('div');
    tabs.className = 'course-tabs';
    const tabList = document.createElement('div');
    tabList.className = 'course-tab-list';
    const panels = document.createElement('div');
    panels.className = 'course-tab-panels';
    let selectedCourseKey = '';

    cursos.forEach(([cursoKey, cursoAssignments], index) => {
        const nomeCurso = cursoAssignments[0]?.cursoNome || 'Curso';
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `course-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = nomeCurso;
        tab.addEventListener('click', () => {
            document.querySelectorAll('.course-tab').forEach(item => item.classList.toggle('active', item === tab));
            document.querySelectorAll('.course-panel').forEach(panel => panel.hidden = panel.dataset.courseKey !== cursoKey);
        });
        if (!selectedCourseKey) selectedCourseKey = cursoKey;
        tabList.appendChild(tab);

        const panel = document.createElement('div');
        panel.className = 'course-panel';
        panel.dataset.courseKey = cursoKey;
        panel.hidden = cursoKey !== selectedCourseKey;

        cursoAssignments.forEach((assignment, assignmentIndex) => {
            const courseStudents = estudantesDaDisciplina(assignment);
            const card = document.createElement('article');
            card.className = 'discipline-card';
            card.dataset.assignmentKey = assignment.key;
            card.innerHTML = `<span class="card-kicker">${escapeHtml(assignment.cursoNome)}</span><span class="discipline-number">${String(assignmentIndex + 1).padStart(2, '0')}</span><h3>${escapeHtml(assignment.nome)}</h3><p>${courseStudents.length} aluno(s) vinculados a esta turma.</p><div class="discipline-meta"><span><i class="fa-solid fa-fingerprint"></i>ID: ${escapeHtml(assignment.turmaId || 'não definido')}</span><span><i class="fa-solid fa-calendar-days"></i>${escapeHtml(assignment.dataCurso)} até ${escapeHtml(assignment.dataTermino)}</span><span><i class="fa-solid fa-clock"></i>${escapeHtml(assignment.turno || assignment.horario || 'Turno a definir')}</span><span><i class="fa-solid fa-calendar-week"></i>${escapeHtml(assignment.diaSemana || 'Dia a definir')}</span></div>`;
            card.addEventListener('click', () => selecionarDisciplina(assignment));
            panel.appendChild(card);
        });
        panels.appendChild(panel);
    });

    tabs.appendChild(tabList);
    tabs.appendChild(panels);
    grid.appendChild(tabs);
}

function selecionarDisciplina(assignment) {
    selectedAssignment = assignment;
    document.querySelectorAll('.discipline-card').forEach(card => card.classList.toggle('selected', card.dataset.assignmentKey === assignment.key));
    document.getElementById('grade-empty').hidden = true;
    document.getElementById('grade-panel').hidden = false;
    document.getElementById('selected-course').textContent = assignment.cursoNome;
    document.getElementById('selected-discipline').textContent = assignment.nome;
    document.getElementById('selected-schedule').textContent = `Turma ${assignment.turmaId || 'sem ID'} • ${assignment.dataCurso} até ${assignment.dataTermino} • ${assignment.turno || assignment.horario || 'Turno a definir'} • ${assignment.diaSemana || 'Dia a definir'}`;
    renderizarTabelaNotas();
    document.getElementById('boletim').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function estudantesDaDisciplina(assignment) {
    return students.filter(student => {
        return student.disciplinaKey === assignment.key
            && student.professorId === professorId
            && student.cursoId === assignment.cursoId
            && String(student.turmaId || '') === String(assignment.turmaId || '');
    });
}

function renderizarTabelaNotas() {
    const body = document.getElementById('grade-table-body');
    body.textContent = '';
    const enrolledStudents = estudantesDaDisciplina(selectedAssignment);
    if (!enrolledStudents.length) {
        body.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum aluno está vinculado ao curso desta disciplina.</td></tr>';
        return;
    }

    enrolledStudents.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))).forEach(student => {
        const recordId = idDoBoletim(student.id, selectedAssignment);
        const record = gradeRecords[recordId] || {};
        const row = document.createElement('tr');
        row.dataset.studentId = student.id;
        row.innerHTML = `<td><strong>${escapeHtml(student.alunoNome || 'Aluno')}</strong></td><td><input class="grade-input" type="number" min="0" max="10" step="0.1" value="${record.nota ?? ''}" placeholder="0,0"></td><td><input class="absence-input" type="number" min="0" step="1" value="${record.faltas ?? 0}"></td><td><span class="status-badge">${situacaoDoAluno(record)}</span></td>`;
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', () => atualizarSituacao(row)));
        body.appendChild(row);
    });
}

function atualizarSituacao(row) {
    const nota = Number(row.querySelector('.grade-input').value);
    const faltas = Number(row.querySelector('.absence-input').value || 0);
    const status = row.querySelector('.status-badge');
    if (!row.querySelector('.grade-input').value) {
        status.textContent = 'Pendente';
        status.className = 'status-badge';
    } else if (nota >= 6 && faltas <= 25) {
        status.textContent = 'Em acompanhamento';
        status.className = 'status-badge approved';
    } else {
        status.textContent = 'Atenção';
        status.className = 'status-badge warning';
    }
}

function situacaoDoAluno(record) {
    if (record.nota === undefined || record.nota === null || record.nota === '') return 'Pendente';
    return Number(record.nota) >= 6 && Number(record.faltas || 0) <= 25 ? 'Em acompanhamento' : 'Atenção';
}

document.getElementById('save-all-button').addEventListener('click', async () => {
    if (!selectedAssignment) return;
    const rows = Array.from(document.querySelectorAll('#grade-table-body tr[data-student-id]'));
    const batch = db.batch();
    const recordsToUpdate = [];

    try {
        rows.forEach(row => {
            const notaValue = row.querySelector('.grade-input').value;
            const faltasValue = row.querySelector('.absence-input').value || '0';
            const nota = notaValue === '' ? null : Number(notaValue.replace(',', '.'));
            const faltas = Number(faltasValue);
            if ((nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 10)) || Number.isNaN(faltas) || faltas < 0) {
                throw new Error('Confira as notas entre 0 e 10 e as faltas a partir de zero.');
            }
            const recordId = idDoBoletim(row.dataset.studentId, selectedAssignment);
            const data = { professorId, alunoId: row.dataset.studentId, cursoId: selectedAssignment.cursoId, cursoNome: selectedAssignment.cursoNome, turmaId: selectedAssignment.turmaId, disciplinaId: selectedAssignment.disciplinaId, disciplinaNome: selectedAssignment.nome, disciplinaKey: selectedAssignment.key, nota, faltas, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };
            batch.set(db.collection('boletins').doc(recordId), data, { merge: true });
            recordsToUpdate.push({ id: recordId, ...data });
        });
        await batch.commit();
        recordsToUpdate.forEach(record => { gradeRecords[record.id] = record; });
        alert('Boletim salvo com sucesso.');
    } catch (error) {
        console.error('Erro ao salvar boletim:', error);
        alert(error.message || 'Não foi possível salvar o boletim.');
    }
});

document.getElementById('mobile-menu-button').addEventListener('click', () => document.getElementById('nav-links').classList.toggle('open'));

function idDoBoletim(studentId, assignment) {
    return encodeURIComponent(`${professorId}__${studentId}__${assignment.key}`);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function mostrarErro(message) {
    const grid = document.getElementById('discipline-grid');
    grid.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = '/login/login.html'; });
}
