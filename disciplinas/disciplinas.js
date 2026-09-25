const firebaseConfig = {
    apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
    authDomain: "themis-154d1.firebaseapp.com",
    projectId: "themis-154d1",
    storageBucket: "themis-154d1.firebasestorage.app",
    messagingSenderId: "1017306886601",
    appId: "1:1017306886601:web:3b7f5057515d244c2bb818"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const disciplinasPadrao = {
    vigilante: ['Noções de Segurança Privada', 'Legislação Aplicada e Direitos Humanos', 'Relações Humanas no Trabalho', 'Sistema de Segurança Pública e Crime Organizado', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Educação Física', 'Defesa Pessoal', 'Armamento e Tiro', 'Vigilância', 'Radiocomunicação e Alarmes', 'Noções de Segurança Eletrônica', 'Uso Progressivo da Força', 'Gerenciamento de Crises'],
    escoltaArm: ['Legislação Aplicada', 'Escolta Armada', 'Resolução de Situações de Emergência', 'Armamento e Tiro', 'Verificação de Aprendizagem'],
    grandesEventos: ['Papel do Vigilante na Estrutura de Segurança em Recintos de Grandes Eventos', 'Controle de Acesso', 'Gerenciamento de Público', 'Gestão de Multidões e Manutenção de Ambiente Seguro', 'Resolução de Situações de Emergência', 'Disciplinas Complementares'],
    Reciclagem: ['Revisão e Atualização das Disciplinas Básicas', 'Armamento e Tiro', 'Relações Humanas no Trabalho', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Defesa Pessoal'],
    armasNaoLetais: ['Uso Progressivo da Força', 'Agentes Químicos e Espargidores', 'Armas de Condutividade Elétrica', 'Primeiros Socorros']
};

firebase.auth().onAuthStateChanged(async user => {
    if (!user) return;
    const aluno = await db.collection('usuarios').doc(user.uid).get();
    if (!aluno.exists) return;
    const dados = aluno.data();
    const cursoAluno = dados.cursoSolicitado || dados.curso || '';
    const cursos = await db.collection('cursos').get();
    const curso = cursos.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .find(item => item.id === cursoAluno || item.nome === cursoAluno || item.nome?.toLowerCase() === cursoAluno.toLowerCase());
    document.getElementById('course-label').textContent = `Curso: ${curso?.nome || cursoAluno || 'não vinculado'}`;
    renderizarDisciplinas(curso?.disciplinas || disciplinasPadrao[curso?.id] || []);
});

function renderizarDisciplinas(disciplinas) {
    const grid = document.getElementById('discipline-grid');
    grid.textContent = '';
    if (!disciplinas.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'Nenhuma disciplina foi cadastrada para este curso ainda.';
        grid.appendChild(empty);
        return;
    }
    disciplinas.forEach((disciplina, index) => {
        const nome = typeof disciplina === 'string' ? disciplina : disciplina.nome;
        const status = typeof disciplina === 'string' ? 'Em andamento' : disciplina.status || 'Em andamento';
        const card = document.createElement('article');
        card.className = 'discipline-card';
        card.innerHTML = `<div class="discipline-card-top"><h2>${nome || 'Disciplina'}</h2><span class="discipline-number">${String(index + 1).padStart(2, '0')}</span></div><p>Conteúdo vinculado à sua formação profissional.</p><span class="discipline-status">${status}</span>`;
        grid.appendChild(card);
    });
}

function logout() {
    firebase.auth().signOut().then(() => window.location.href = '/login/login.html');
}
