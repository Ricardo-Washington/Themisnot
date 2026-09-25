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

firebase.auth().onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = '/login/login.html';
        return;
    }

    try {
        const [studentSnapshot, coursesSnapshot, gradesSnapshot] = await Promise.all([
            db.collection('usuarios').doc(user.uid).get(),
            db.collection('cursos').get(),
            db.collection('boletins').where('alunoId', '==', user.uid).get()
        ]);
        const student = studentSnapshot.data() || {};
        const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const course = localizarCurso(student, courses);
        const grades = gradesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarBoletim(student, course, grades);
    } catch (error) {
        console.error('Erro ao carregar boletim:', error);
        document.getElementById('report-body').innerHTML = '<tr><td colspan="4" class="empty">Não foi possível carregar seu boletim.</td></tr>';
    }
});

function localizarCurso(student, courses) {
    const cursoAluno = String(student.cursoSolicitado || student.curso || '').trim().toLowerCase();
    return courses.find(course => course.id.toLowerCase() === cursoAluno || String(course.nome || '').toLowerCase() === cursoAluno) || null;
}

function renderizarBoletim(student, course, grades) {
    const courseName = course?.nome || student.cursoSolicitado || student.curso || 'Curso não vinculado';
    document.getElementById('student-course').textContent = `Aluno: ${student.nome || 'Estudante'} • Curso: ${courseName}`;

    const disciplines = (course?.disciplinas || []).map(item => {
        if (typeof item === 'string') return { nome: item };
        return { nome: item.nome || 'Disciplina' };
    });
    const report = disciplines.map(discipline => ({
        ...discipline,
        record: obterRegistroMaisRecente(grades, discipline.nome, course, student.turmaId)
    }));

    document.getElementById('discipline-count').textContent = report.length;
    document.getElementById('absence-total').textContent = report.reduce((total, item) => total + Number(item.record?.faltas || 0), 0);
    const notes = report.map(item => Number(item.record?.nota)).filter(note => !Number.isNaN(note));
    document.getElementById('average-grade').textContent = notes.length ? (notes.reduce((sum, note) => sum + note, 0) / notes.length).toFixed(1).replace('.', ',') : '--';

    const body = document.getElementById('report-body');
    body.textContent = '';
    if (!report.length) {
        body.innerHTML = '<tr><td colspan="4" class="empty">Nenhuma disciplina foi vinculada ao seu curso ainda.</td></tr>';
        return;
    }

    report.forEach(item => {
        const record = item.record || {};
        const status = definirSituacao(record);
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${escapeHtml(item.nome)}</strong></td><td>${record.nota === undefined || record.nota === null ? '--' : formatarNota(record.nota)}</td><td>${record.faltas ?? 0}</td><td><span class="status ${status.classe}">${status.texto}</span></td>`;
        body.appendChild(row);
    });
}

function obterRegistroMaisRecente(grades, disciplineName, course, turmaId) {
    const matches = grades.filter(grade => String(grade.disciplinaNome || '').toLowerCase() === disciplineName.toLowerCase() && (!course || !grade.cursoId || grade.cursoId === course.id || grade.cursoNome === course.nome) && (!turmaId || grade.turmaId === turmaId));
    return matches.sort((first, second) => timestampValue(second.atualizadoEm) - timestampValue(first.atualizadoEm))[0] || null;
}

function timestampValue(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    return new Date(value).getTime() || 0;
}

function formatarNota(value) {
    return Number(value).toFixed(1).replace('.', ',');
}

function definirSituacao(record) {
    if (record.nota === undefined || record.nota === null || record.nota === '') return { texto: 'Pendente', classe: '' };
    if (Number(record.nota) >= 6 && Number(record.faltas || 0) <= 25) return { texto: 'Em acompanhamento', classe: 'approved' };
    return { texto: 'Atenção', classe: 'warning' };
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = '/login/login.html'; });
}
