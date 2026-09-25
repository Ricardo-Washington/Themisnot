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
let assignments = [];
let courses = [];
let students = [];
let gradeRecords = {};
let selectedAssignment = null;
let professorDisciplinasKeys = [];

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
        const primeiroNome = String(professor.nome || user.email || 'professor').split(' ')[0];
        document.getElementById('teacher-name').textContent = primeiroNome;
        document.getElementById('teacher-greeting').textContent = `Olá, ${primeiroNome}`;
        assignments = normalizarDisciplinas(professor.disciplinas || professor.disciplinasVinculadas);
        professorDisciplinasKeys = Array.isArray(professor.disciplinasKeys) ? professor.disciplinasKeys : [];
        await carregarDadosAcademicos();
    } catch (error) {
        console.error('Erro ao carregar área do professor:', error);
        mostrarErro('Não foi possível carregar os dados acadêmicos.');
    }
});

async function carregarDadosAcademicos() {
    const [coursesSnapshot, studentsSnapshot, gradesSnapshot] = await Promise.all([
        db.collection('cursos').get(),
            db.collection('usuarios').where('atribuicao', 'in', ['aluno', 'Aluno']).get(),
        db.collection('boletins').where('professorId', '==', professorId).get()
    ]);

    courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (!assignments.length && professorDisciplinasKeys.length) {
        assignments = reconstruirDisciplinasPorChaves(professorDisciplinasKeys);
    }
    students = studentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(student => String(student.atribuicao || '').toLowerCase() === 'aluno');
    gradeRecords = {};
    gradesSnapshot.forEach(doc => {
        gradeRecords[doc.id] = { id: doc.id, ...doc.data() };
    });

    assignments = assignments.map(assignment => enriquecerDisciplina(assignment));
    if (assignments.length) await sincronizarChavesDeDisciplinas();
    renderizarResumo();
    renderizarDisciplinas();
}

function reconstruirDisciplinasPorChaves(chaves) {
    return chaves.map(chave => {
        const partes = String(chave).split('::');
        if (partes.length >= 3) {
            return { cursoId: partes[0], turmaId: partes[1] === 'sem-turma' ? '' : partes[1], nome: partes.slice(2).join('::') };
        }
        return { cursoId: partes[0] || '', turmaId: '', nome: partes.slice(1).join('::') || 'Disciplina' };
    });
}

async function sincronizarChavesDeDisciplinas() {
    const disciplinasKeys = assignments.map(assignment => assignment.key);
    await db.collection('usuarios').doc(professorId).update({ disciplinasKeys });
}

function normalizarDisciplinas(disciplinas) {
    if (disciplinas && !Array.isArray(disciplinas) && typeof disciplinas === 'object') {
        disciplinas = Object.values(disciplinas);
    }
    if (!Array.isArray(disciplinas)) return [];
    return disciplinas.map(item => {
        if (typeof item === 'string') return { nome: item, cursoId: '', cursoNome: '' };
        return {
            nome: item.nome || item.disciplinaNome || item.disciplina || 'Disciplina',
            cursoId: item.cursoId || item.idCurso || '',
            cursoNome: item.cursoNome || item.nomeCurso || '',
            turmaId: item.turmaId || item.idTurma || '',
            dataInicio: item.dataInicio || '',
            dataTermino: item.dataTermino || item.dataFim || '',
            turno: item.turno || '',
            diaSemana: item.diaSemana || item.dia || '',
            horario: item.horario || ''
        };
    });
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

    assignments.forEach((assignment, index) => {
        const courseStudents = estudantesDaDisciplina(assignment);
        const card = document.createElement('article');
        card.className = 'discipline-card';
        card.dataset.assignmentKey = assignment.key;
        card.innerHTML = `<span class="card-kicker">${escapeHtml(assignment.cursoNome)}</span><span class="discipline-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(assignment.nome)}</h3><p>${courseStudents.length} aluno(s) vinculados a esta turma.</p><div class="discipline-meta"><span><i class="fa-solid fa-fingerprint"></i>ID: ${escapeHtml(assignment.turmaId || 'não definido')}</span><span><i class="fa-solid fa-calendar-days"></i>${escapeHtml(assignment.dataCurso)} até ${escapeHtml(assignment.dataTermino)}</span><span><i class="fa-solid fa-clock"></i>${escapeHtml(assignment.turno || assignment.horario || 'Turno a definir')}</span><span><i class="fa-solid fa-calendar-week"></i>${escapeHtml(assignment.diaSemana || 'Dia a definir')}</span></div>`;
        card.addEventListener('click', () => selecionarDisciplina(assignment));
        grid.appendChild(card);
    });
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
        const curso = String(student.cursoSolicitado || student.curso || '').toLowerCase();
        const mesmaTurma = !assignment.turmaId || String(student.turmaId || '').toLowerCase() === String(assignment.turmaId).toLowerCase();
        return mesmaTurma && (curso === String(assignment.cursoId).toLowerCase() || curso === String(assignment.cursoNome).toLowerCase());
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
        row.innerHTML = `<td><strong>${escapeHtml(student.nome || student.email || 'Aluno')}</strong><br><small>${escapeHtml(student.email || '')}</small></td><td><input class="grade-input" type="number" min="0" max="10" step="0.1" value="${record.nota ?? ''}" placeholder="0,0"></td><td><input class="absence-input" type="number" min="0" step="1" value="${record.faltas ?? 0}"></td><td><span class="status-badge">${situacaoDoAluno(record)}</span></td>`;
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
            const data = { professorId, alunoId: row.dataset.studentId, cursoId: selectedAssignment.cursoId, cursoNome: selectedAssignment.cursoNome, turmaId: selectedAssignment.turmaId, disciplinaNome: selectedAssignment.nome, disciplinaKey: selectedAssignment.key, nota, faltas, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };
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
