// A inicialização do Firebase e o objeto `db` vêm agora do arquivo compartilhado global: /js/firebase-config-shared.js
    
    // Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const dados = userDoc.data();
        const atribuicao = dados ? dados.atribuicao : null;

        if (dados && (dados.nome || dados.nomeCompleto)) {
            const nomeExibicao = dados.nome || dados.nomeCompleto;
            const pNome = String(nomeExibicao).split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
        }

        if (atribuicao !== 'adm' && atribuicao !== 'admin') {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/home/home.html';
            return;
        }

        findUsers();
    } catch (error) {
        console.error('Erro ao verificar permissão de administrador:', error);
        window.location.href = '/login/login.html';
    }
});

let usuariosFuncionarios = [];
let usuariosProfessores = [];
let usuariosAlunos = [];
let cursosList = [];
let usuarioAtual = null;
let tipoAtual = null; 
let disciplinasProfessorDisponiveis = [];

// A função principal para buscar e separar os dados
function findUsers() {
  firebase.firestore()// busca do fire base 
    .collection('usuarios')
    .orderBy('dataCadastro', 'desc')
    .get()
    .then(snapshot => {
      const todosUsuarios = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

      usuariosFuncionarios = todosUsuarios.filter(user => user.atribuicao === 'funcionario');
      usuariosProfessores = todosUsuarios.filter(user => user.atribuicao === 'professor');
      usuariosAlunos = todosUsuarios.filter(user => user.atribuicao === 'aluno' || user.atribuicao === 'Aluno');
      renderizarLista('dadosfuincionario', usuariosFuncionarios);
      renderizarLista('dadosaluno', usuariosAlunos);
      // Atualiza o gráfico de inscrições mensais usando apenas os alunos
      renderarGraficoInscricoes(usuariosAlunos);
    })
    .catch(error => {
      console.error("Erro ao buscar usuários: ", error);
    });
  
  fetchCursos();
  fetchLogs(); // inicia a busca de logs
}

function fetchLogs() {
  firebase.firestore()
    .collection('logs_auditoria')
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get()
    .then(snapshot => {
      const logsList = snapshot.docs.map(doc => doc.data());
      renderizarLogs('dadosauditoria', logsList);
    })
    .catch(error => {
      console.error("Erro ao buscar logs: ", error);
    });
}

function fetchCursos() {//busca os cursos no fire base 
  firebase.firestore()
    .collection('cursos')
    .get()
    .then(snapshot => {
      cursosList = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
      if (cursosList.length === 0) {
        initCursos();
      } else {
        sincronizarDisciplinasPadrao(cursosList);
        renderizarCursos('dadoscursos', cursosList);//renderiza os cursos
      }
    })
    .catch(error => {
      console.error("Erro ao buscar cursos: ", error);//tratamento de erro 
    });
}

const disciplinasPorCursoPadrao = {
  vigilante: [
    'Noções de Segurança Privada', 'Legislação Aplicada e Direitos Humanos',
    'Relações Humanas no Trabalho', 'Sistema de Segurança Pública e Crime Organizado',
    'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Educação Física',
    'Defesa Pessoal', 'Armamento e Tiro', 'Vigilância', 'Radiocomunicação e Alarmes',
    'Noções de Segurança Eletrônica', 'Uso Progressivo da Força', 'Gerenciamento de Crises'
  ],
  escoltaArmada: [
    'Legislação Aplicada', 'Escolta Armada', 'Resolução de Situações de Emergência',
    'Armamento e Tiro', 'Verificação de Aprendizagem'
  ],
  armasNaoLetais: [
    'Uso Progressivo da Força', 'Agentes Químicos e Espargidores',
    'Armas de Condutividade Elétrica', 'Primeiros Socorros'
  ],
  reciclagem: [
    'Revisão e Atualização das Disciplinas Básicas', 'Armamento e Tiro',
    'Relações Humanas no Trabalho', 'Prevenção e Combate a Incêndios',
    'Primeiros Socorros', 'Defesa Pessoal'
  ],
  grandesEventos: [
    'Papel do Vigilante na Estrutura de Segurança em Recintos de Grandes Eventos',
    'Controle de Acesso', 'Gerenciamento de Público',
    'Gestão de Multidões e Manutenção de Ambiente Seguro',
    'Resolução de Situações de Emergência', 'Disciplinas Complementares'
  ]
};

function disciplinasDoCursoPadrao(curso) {
  const identificador = `${curso.id || ''} ${curso.nome || ''}`.toLowerCase();
  if (curso.id === 'vigilante' || identificador.includes('formação básica de vigilante') || identificador.includes('curso de vigilante')) {
    return disciplinasPorCursoPadrao.vigilante;
  }
  if (curso.id === 'escoltaArm' || identificador.includes('escolta armada')) {
    return disciplinasPorCursoPadrao.escoltaArmada;
  }
  if (curso.id === 'armasNaoLetais' || identificador.includes('armas não letais') || identificador.includes('armamento não letal')) {
    return disciplinasPorCursoPadrao.armasNaoLetais;
  }
  if (curso.id === 'Reciclagem' || identificador.includes('reciclagem')) {
    return disciplinasPorCursoPadrao.reciclagem;
  }
  if (curso.id === 'grandesEventos' || identificador.includes('grandes eventos')) {
    return disciplinasPorCursoPadrao.grandesEventos;
  }
  return null;
}

async function sincronizarDisciplinasPadrao(cursos) {
  const batch = firebase.firestore().batch();
  let alteracoes = 0;
  cursos.forEach(curso => {
    const disciplinas = disciplinasDoCursoPadrao(curso);
    if (!disciplinas || JSON.stringify(curso.disciplinas || []) === JSON.stringify(disciplinas)) return;
    batch.update(firebase.firestore().collection('cursos').doc(curso.id), { disciplinas });
    alteracoes += 1;
  });
  if (alteracoes) await batch.commit();
}

// Variável global para manter o gráfico vivo entre atualizações.
let inscricoesChart = null;

// Nomes dos meses em português para exibir na escala X do gráfico.
const monthNamesPT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Gera os rótulos dos últimos meses.
 * Exemplo: ["Nov 2025", "Dez 2025", "Jan 2026", "Fev 2026", "Mar 2026", "Abr 2026"]
 */
function gerarUltimosMeses(qtd = 6) {
  const meses = [];
  const hoje = new Date();
  for (let i = qtd - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(`${monthNamesPT[data.getMonth()]} ${data.getFullYear()}`);
  }
  return meses;
}

/**
 * Conta quantos alunos foram cadastrados em cada mês exibido no gráfico.
 * Recebe a lista de alunos e os labels de mês já gerados.
 */
function contarInscricoesPorMes(alunos, labels) {
  const contagem = labels.map(() => 0);
  alunos.forEach(aluno => {
    const dataCadastro = aluno.dataCadastro;
    if (!dataCadastro) return;

    let data = null;
    if (typeof dataCadastro === 'string') {
      data = new Date(dataCadastro);
    } else if (dataCadastro.toDate) {
      data = dataCadastro.toDate();
    }

    if (!data || isNaN(data.getTime())) return;

    const mesLabel = `${monthNamesPT[data.getMonth()]} ${data.getFullYear()}`;
    const index = labels.indexOf(mesLabel);
    if (index !== -1) contagem[index] += 1;
  });
  return contagem;
}

/**
 * Cria ou atualiza o gráfico de barras com as inscrições mensais.
 * Se o gráfico já existir, apenas atualiza os dados.
 */
function renderarGraficoInscricoes(alunos) {
  const labels = gerarUltimosMeses(6);
  const valores = contarInscricoesPorMes(alunos, labels);
  const ctx = document.getElementById('inscricoesChart');
  if (!ctx) return;

  if (inscricoesChart) {
    inscricoesChart.data.labels = labels;
    inscricoesChart.data.datasets[0].data = valores;
    inscricoesChart.update();
    return;
  }

  inscricoesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alunos inscritos',
        data: valores,
        backgroundColor: 'rgba(255, 94, 0, 0.85)',
        borderColor: 'rgba(255, 158, 0, 1)',
        borderWidth: 1,
        borderRadius: 12,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.parsed.y} aluno(s)`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#f0f0f0' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.10)' },
          ticks: { color: '#f0f0f0', stepSize: 1 }
        }
      }
    }
  });
}
//função para iniciar os cursos caso não exista
function initCursos() {
    const cursosPadrao = [
    { id: "armasNaoLetais", nome: "Extensão ou Aperfeiçoamento em Armas Não Letais", preco: "500,00", cargaHoraria: "80 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.armasNaoLetais },
        { id: "Reciclagem", nome: "Reciclagem de Vigilantes", preco: "300,00", cargaHoraria: "40 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.reciclagem },
    { id: "escoltaArm", nome: "Escolta Armada", preco: "600,00", cargaHoraria: "50 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.escoltaArmada },
        { id: "grandesEventos", nome: "Curso de Extensão em Segurança para Grandes Eventos", preco: "450,00", cargaHoraria: "60 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.grandesEventos },
    { id: "vigilante", nome: "Vigilante", preco: "800,00", cargaHoraria: "200 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.vigilante }
    ];

    const batch = firebase.firestore().batch();
    cursosPadrao.forEach(curso => {
        const docRef = firebase.firestore().collection('cursos').doc(curso.id);
        batch.set(docRef, curso);
    });

    batch.commit().then(() => {
        fetchCursos();
    }).catch(error => console.error(error));
}

// A função reutilizável para renderizar a lista (Com proteção XSS)
function renderizarLista(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  dados.forEach(usuario => {
    const li = document.createElement('li');
    li.classList.add('item');

    const nome = document.createElement('p');
    const nomeStrong = document.createElement('strong');
    nomeStrong.textContent = 'Nome: ';
    nome.appendChild(nomeStrong);
    nome.appendChild(document.createTextNode(usuario.nome));
    li.appendChild(nome);

    const cpf = document.createElement('p');
    const cpfStrong = document.createElement('strong');
    cpfStrong.textContent = 'CPF: ';
    cpf.appendChild(cpfStrong);
    cpf.appendChild(document.createTextNode(usuario.cpf));
    li.appendChild(cpf);

    const atribuicao = document.createElement('p');
    const atribStrong = document.createElement('strong');
    atribStrong.textContent = 'Atribuição: ';
    atribuicao.appendChild(atribStrong);
    atribuicao.appendChild(document.createTextNode(usuario.atribuicao));
    li.appendChild(atribuicao);

    lista.appendChild(li);
  });
}

function renderizarCursos(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  dados.forEach(curso => {
    const li = document.createElement('li');
    li.classList.add('item');

    const nome = document.createElement('p');
    nome.innerHTML = `<strong>Curso:</strong> ${curso.nome}`;
    li.appendChild(nome);

    const detalhes = document.createElement('p');
    detalhes.textContent = `Preço: R$ ${curso.preco} | C. Horária: ${curso.cargaHoraria}`;
    li.appendChild(detalhes);

    const turma = document.createElement('p');
    turma.textContent = `Próxima Turma: ${curso.proximaTurma}`;
    li.appendChild(turma);

    lista.appendChild(li);
  });
}

function renderizarLogs(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';
  
  if (dados.length === 0) {
      lista.innerHTML = '<p style="color:var(--white); text-align:center;">Nenhum log recente.</p>';
      return;
  }

  dados.forEach(log => {
      const li = document.createElement('li');
      li.classList.add('item');
      li.style.borderLeftColor = '#888';
      
      const p1 = document.createElement('p');
      p1.innerHTML = `<strong style="color:var(--orange)">Ação:</strong> ${log.acao}`;
      
      const p2 = document.createElement('p');
      p2.innerHTML = `<strong>Por:</strong> ${log.email} (${log.tipoUsuario})`;
      
      const p3 = document.createElement('p');
      // Firebase serverTimestamp() may be null during local optimistic updates
      const dataStr = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : 'agora mesmo';
      p3.textContent = `Em: ${dataStr}`;
      
      li.appendChild(p1);
      li.appendChild(p2);
      li.appendChild(p3);
      lista.appendChild(li);
  });
}

// Modal
function openModal(tipo) {
  tipoAtual = tipo;
  const modal = document.getElementById('editModal');
  const select = document.getElementById('selectUsuario');
  
  // Campos
  const camposUsuario = document.getElementById('camposUsuario');
  const camposCurso = document.getElementById('camposCurso');
  
  const nomeInput = document.getElementById('editNome');
  const emailInput = document.getElementById('editEmail');
  const cpfInput = document.getElementById('editCpf');
  const orgaoRgInput = document.getElementById('editOrgaoRg');
  const enderecoInput = document.getElementById('editEndereco');
  const cepInput = document.getElementById('editCep');
  const logradouroInput = document.getElementById('editLogradouro');
  const numeroInput = document.getElementById('editNumero');
  const bairroInput = document.getElementById('editBairro');
  const cidadeInput = document.getElementById('editCidade');
  const ufInput = document.getElementById('editUf');
  const telefoneInput = document.getElementById('editTelefone');
  const telefoneAltInput = document.getElementById('editTelefoneAlt');
  const rgInput = document.getElementById('editRg');
  const nascimentoInput = document.getElementById('editNascimento');
  const atribuicaoSelect = document.getElementById('editAtribuicao');
  
  const nomeCursoInput = document.getElementById('editNomeCurso');
  const precoInput = document.getElementById('editPreco');
  const cargaHrInput = document.getElementById('editCargaHr');
  const dataTurmaInput = document.getElementById('editDataTurma');
  const turmaIdInput = document.getElementById('editTurmaId');
  const dataInicioInput = document.getElementById('editDataInicio');
  const dataTerminoInput = document.getElementById('editDataTermino');
  const turnoInput = document.getElementById('editTurno');
  
  const deleteBtn = document.getElementById('deleteButton');
  const modalTitle = document.getElementById('modalTitle');

  select.innerHTML = '';

  if (tipo === 'curso' || tipo === 'curso_novo') {
    camposUsuario.style.display = 'none';
    camposCurso.style.display = 'flex';
    camposCurso.style.flexDirection = 'column';
    camposCurso.style.gap = '18px';
    
    if (tipo === 'curso_novo') {
        modalTitle.textContent = 'Criar Novo Curso';
        select.style.display = 'none';
        document.querySelector('.requiredq').style.display = 'none'; // Oculta label 'Selecione o registro'
        
        // Ativa ediçao do nome para novos
        nomeCursoInput.disabled = false;
        nomeCursoInput.style.background = '';
        nomeCursoInput.style.cursor = 'text';
        
        usuarioAtual = null;
        nomeCursoInput.value = '';
        precoInput.value = '';
        cargaHrInput.value = '';
        dataTurmaInput.value = '';
        turmaIdInput.value = '';
        dataInicioInput.value = '';
        dataTerminoInput.value = '';
        turnoInput.value = '';
        deleteBtn.style.display = 'none';
    } else {
        modalTitle.textContent = 'Editar Curso';
        select.style.display = 'block';
        document.querySelector('.requiredq').style.display = 'block';
        
        // Bloqueia edição do nome
        nomeCursoInput.disabled = true;
        nomeCursoInput.style.background = '#333';
        nomeCursoInput.style.cursor = 'not-allowed';
    
    cursosList.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.nome;
      select.appendChild(option);
    });

    if (cursosList.length > 0) {
      usuarioAtual = cursosList[0];
      nomeCursoInput.value = usuarioAtual.nome || '';
      precoInput.value = usuarioAtual.preco || '';
      cargaHrInput.value = usuarioAtual.cargaHoraria || '';
      dataTurmaInput.value = usuarioAtual.proximaTurma || '';
      const turmaAtual = Array.isArray(usuarioAtual.turmas) ? usuarioAtual.turmas[usuarioAtual.turmas.length - 1] : null;
      turmaIdInput.value = turmaAtual?.id || turmaAtual?.turmaId || '';
      dataInicioInput.value = turmaAtual?.dataInicio || usuarioAtual.dataInicio || '';
      dataTerminoInput.value = turmaAtual?.dataTermino || turmaAtual?.dataFim || usuarioAtual.dataTermino || '';
      turnoInput.value = turmaAtual?.turno || usuarioAtual.turno || '';
      deleteBtn.style.display = 'none';
    }
  } // fim do bloco de edicao de curso
  } else {
    // Bloco de Usuarios (Funcionario e Aluno)
    camposUsuario.style.display = 'flex';
    select.style.display = 'block';
    document.querySelector('.requiredq').style.display = 'block';
    camposUsuario.style.flexDirection = 'column';
    camposUsuario.style.gap = '18px';
    camposCurso.style.display = 'none';
    
    let lista = tipo === 'funcionario' ? usuariosFuncionarios : (tipo === 'professor' ? usuariosProfessores : usuariosAlunos);
    modalTitle.textContent = tipo === 'funcionario' ? 'Editar Funcionário' : (tipo === 'professor' ? 'Editar Professor' : 'Editar Aluno');

    lista.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.nome + ' (' + user.cpf + ')';
      select.appendChild(option);
    });

    if (lista.length > 0) {
      usuarioAtual = lista[0];
      nomeInput.value = usuarioAtual.nome || '';
      emailInput.value = usuarioAtual.email || '';
      cpfInput.value = usuarioAtual.cpf || '';
      orgaoRgInput.value = usuarioAtual.orgaoRg || '';
      enderecoInput.value = usuarioAtual.endereco || '';
      cepInput.value = usuarioAtual.cep || '';
      logradouroInput.value = usuarioAtual.logradouro || '';
      numeroInput.value = usuarioAtual.numero || '';
      bairroInput.value = usuarioAtual.bairro || '';
      cidadeInput.value = usuarioAtual.cidade || '';
      ufInput.value = usuarioAtual.uf || '';
      telefoneInput.value = usuarioAtual.telefone || '';
      telefoneAltInput.value = usuarioAtual.telefoneAlt || '';
      rgInput.value = usuarioAtual.rg || '';
      nascimentoInput.value = usuarioAtual.nascimento || '';
      atribuicaoSelect.value = usuarioAtual.atribuicao || '';
      atualizarCampoDisciplinasProfessor(usuarioAtual.atribuicao, usuarioAtual.disciplinas || []);
      atualizarCamposMatriculaAluno(usuarioAtual.atribuicao, usuarioAtual);
      deleteBtn.style.display = 'inline-block';
    } else {
      usuarioAtual = null;
      nomeInput.value = '';
      emailInput.value = '';
      cpfInput.value = '';
      orgaoRgInput.value = '';
      enderecoInput.value = '';
      cepInput.value = '';
      logradouroInput.value = '';
      numeroInput.value = '';
      bairroInput.value = '';
      cidadeInput.value = '';
      ufInput.value = '';
      telefoneInput.value = '';
      telefoneAltInput.value = '';
      rgInput.value = '';
      nascimentoInput.value = '';
      atribuicaoSelect.value = '';
      atualizarCampoDisciplinasProfessor('');
      atualizarCamposMatriculaAluno('');
      deleteBtn.style.display = 'none';
    }
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Atualiza campos ao trocar usuário/curso selecionado
document.getElementById('selectUsuario').addEventListener('change', function() {
  if (tipoAtual === 'curso') {
    usuarioAtual = cursosList.find(c => c.id === this.value);
    document.getElementById('editNomeCurso').value = usuarioAtual?.nome || '';
    document.getElementById('editPreco').value = usuarioAtual?.preco || '';
    document.getElementById('editCargaHr').value = usuarioAtual?.cargaHoraria || '';
    document.getElementById('editDataTurma').value = usuarioAtual?.proximaTurma || '';
    const turmaAtual = Array.isArray(usuarioAtual?.turmas) ? usuarioAtual.turmas[usuarioAtual.turmas.length - 1] : null;
    document.getElementById('editTurmaId').value = turmaAtual?.id || turmaAtual?.turmaId || '';
    document.getElementById('editDataInicio').value = turmaAtual?.dataInicio || usuarioAtual?.dataInicio || '';
    document.getElementById('editDataTermino').value = turmaAtual?.dataTermino || turmaAtual?.dataFim || usuarioAtual?.dataTermino || '';
    document.getElementById('editTurno').value = turmaAtual?.turno || usuarioAtual?.turno || '';
  } else {
    let lista = tipoAtual === 'funcionario' ? usuariosFuncionarios : (tipoAtual === 'professor' ? usuariosProfessores : usuariosAlunos);
    usuarioAtual = lista.find(u => u.id === this.value);
    document.getElementById('editNome').value = usuarioAtual?.nome || '';
    document.getElementById('editEmail').value = usuarioAtual?.email || '';
    document.getElementById('editCpf').value = usuarioAtual?.cpf || '';
    document.getElementById('editOrgaoRg').value = usuarioAtual?.orgaoRg || '';
    document.getElementById('editEndereco').value = usuarioAtual?.endereco || '';
    document.getElementById('editCep').value = usuarioAtual?.cep || '';
    document.getElementById('editLogradouro').value = usuarioAtual?.logradouro || '';
    document.getElementById('editNumero').value = usuarioAtual?.numero || '';
    document.getElementById('editBairro').value = usuarioAtual?.bairro || '';
    document.getElementById('editCidade').value = usuarioAtual?.cidade || '';
    document.getElementById('editUf').value = usuarioAtual?.uf || '';
    document.getElementById('editTelefone').value = usuarioAtual?.telefone || '';
    document.getElementById('editTelefoneAlt').value = usuarioAtual?.telefoneAlt || '';
    document.getElementById('editRg').value = usuarioAtual?.rg || '';
    document.getElementById('editNascimento').value = usuarioAtual?.nascimento || '';
    document.getElementById('editAtribuicao').value = usuarioAtual?.atribuicao || '';
    atualizarCampoDisciplinasProfessor(usuarioAtual?.atribuicao, usuarioAtual?.disciplinas || []);
    atualizarCamposMatriculaAluno(usuarioAtual?.atribuicao, usuarioAtual);
  }
});

document.getElementById('editAtribuicao').addEventListener('change', function() {
  atualizarCampoDisciplinasProfessor(this.value, this.value === 'professor' ? (usuarioAtual?.disciplinas || []) : []);
  atualizarCamposMatriculaAluno(this.value, usuarioAtual);
});

function atualizarCamposMatriculaAluno(atribuicao, aluno = {}) {
  const campos = document.getElementById('camposMatriculaAluno');
  if (!campos) return;
  campos.style.display = atribuicao === 'aluno' ? 'flex' : 'none';
  if (atribuicao !== 'aluno') return;
  document.getElementById('editCursoAluno').value = aluno.cursoSolicitado || aluno.curso || '';
  document.getElementById('editTurmaAluno').value = aluno.turmaId || '';
  document.getElementById('editInicioAluno').value = aluno.dataInicio || '';
  document.getElementById('editTerminoAluno').value = aluno.dataTermino || '';
}

async function atualizarCampoDisciplinasProfessor(atribuicao, selecionadas = []) {
  const campos = document.getElementById('camposProfessorDisciplinas');
  if (!campos) return;
  campos.style.display = atribuicao === 'professor' ? 'flex' : 'none';
  if (atribuicao !== 'professor') return;

  const container = document.getElementById('editProfessorDisciplinas');
  container.innerHTML = '<span>Carregando disciplinas...</span>';
  try {
    const snapshot = await db.collection('cursos').get();
    const opcoes = [];
    const chaves = new Set();
    snapshot.forEach(doc => {
      const curso = doc.data() || {};
      const turmas = Array.isArray(curso.turmas) && curso.turmas.length ? curso.turmas : [{ id: '', dataInicio: curso.dataInicio || '', dataTermino: curso.dataTermino || '', turno: curso.turno || '' }];
      turmas.forEach(turma => (Array.isArray(curso.disciplinas) ? curso.disciplinas : []).forEach(item => {
        const nome = typeof item === 'string' ? item : item.nome;
        if (!nome) return;
        const turmaId = turma.id || turma.turmaId || '';
        const chave = `${doc.id}::${turmaId || 'sem-turma'}::${nome}`;
        if (chaves.has(chave)) return;
        chaves.add(chave);
        opcoes.push({ chave, cursoId: doc.id, cursoNome: curso.nome || doc.id, nome, turmaId, dataInicio: turma.dataInicio || '', dataTermino: turma.dataTermino || '', turno: turma.turno || '' });
      }));
    });
    disciplinasProfessorDisponiveis = opcoes;
    const selecionadasChaves = new Set(selecionadas.map(item => `${item.cursoId}::${item.turmaId || 'sem-turma'}::${item.nome}`));
    container.innerHTML = opcoes.length ? opcoes.map(item => `<label class="professor-discipline-option"><input type="checkbox" value="${escapeHtml(item.chave)}" ${selecionadasChaves.has(item.chave) ? 'checked' : ''}><span><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml(item.cursoNome)}${item.turmaId ? ` • Turma ${escapeHtml(item.turmaId)}` : ''}</small></span></label>`).join('') : '<span>Nenhuma disciplina cadastrada nos cursos.</span>';
  } catch (error) {
    console.error('Erro ao carregar disciplinas do professor:', error);
    container.innerHTML = '<span>Não foi possível carregar as disciplinas.</span>';
  }
}

function obterDisciplinasProfessorSelecionadas() {
  return Array.from(document.querySelectorAll('#editProfessorDisciplinas input:checked'))
    .map(input => disciplinasProfessorDisponiveis.find(item => item.chave === input.value))
    .filter(Boolean)
    .map(({ chave, ...disciplina }) => disciplina);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function montarVinculoAcademico(cursoInformado, turmaId, dataInicio, dataTermino) {
  const snapshot = await db.collection('cursos').get();
  const valorCurso = String(cursoInformado || '').trim().toLowerCase();
  const curso = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .find(item => item.id.toLowerCase() === valorCurso || String(item.nome || '').toLowerCase() === valorCurso);
  if (!curso) return null;
  const turma = (curso.turmas || []).find(item => (item.id || item.turmaId) === turmaId);
  const cursoNome = curso.nome || curso.id;
  const disciplinas = (Array.isArray(curso.disciplinas) ? curso.disciplinas : []).map(item => {
    const nome = typeof item === 'string' ? item : item.nome;
    return { nome, cursoId: curso.id, cursoNome, turmaId, dataInicio, dataTermino };
  }).filter(item => item.nome);
  return {
    cursoId: curso.id,
    cursoSolicitado: cursoNome,
    turmaId: turmaId || turma?.id || turma?.turmaId || '',
    dataInicio: dataInicio || turma?.dataInicio || '',
    dataTermino: dataTermino || turma?.dataTermino || turma?.dataFim || '',
    disciplinas,
    disciplinasKeys: disciplinas.map(item => `${item.cursoId}::${item.turmaId || 'sem-turma'}::${item.nome}`)
  };
}

// Editar usuário ou curso
document.getElementById('editForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (tipoAtual === 'curso_novo') {
      const nomeCurso = document.getElementById('editNomeCurso').value;
      const preco = document.getElementById('editPreco').value;
      const cargaHr = document.getElementById('editCargaHr').value;
      const dataTurma = document.getElementById('editDataTurma').value;
      const turmaId = document.getElementById('editTurmaId').value.trim();
      const dataInicio = document.getElementById('editDataInicio').value;
      const dataTermino = document.getElementById('editDataTermino').value;
      const turno = document.getElementById('editTurno').value;
      
      if (!nomeCurso) {
          alert('Por favor, digite o nome do curso.');
          return;
      }
      
      firebase.firestore()
        .collection('cursos')
        .add({
          nome: nomeCurso,
          preco: preco || '',
          cargaHoraria: cargaHr || '',
          proximaTurma: dataTurma || '',
          turmas: turmaId ? [{ id: turmaId, dataInicio, dataTermino, turno, status: 'planejada' }] : []
        })
        .then(() => {
          if (window.registrarLogAudit) registrarLogAudit(`Criou Curso: ${nomeCurso}`, 'adm', {preco, cargaHr});
          showToast("Curso criado com sucesso!", "success");
          closeModal();
          fetchCursos();
          fetchLogs();
        })
        .catch(error => {
          showToast("Erro ao criar: " + error.message, "error");
        });
      return; 
  }

  // Se nao for novo curso, requer que tenha um selecionado
  if (!usuarioAtual) return;

  if (tipoAtual === 'curso') {
      const preco = document.getElementById('editPreco').value;
      const cargaHr = document.getElementById('editCargaHr').value;
      const dataTurma = document.getElementById('editDataTurma').value;
      const turmaId = document.getElementById('editTurmaId').value.trim();
      const dataInicio = document.getElementById('editDataInicio').value;
      const dataTermino = document.getElementById('editDataTermino').value;
      const turno = document.getElementById('editTurno').value;
      const turmasAtuais = Array.isArray(usuarioAtual.turmas) ? usuarioAtual.turmas : [];
      const turmas = turmaId
        ? [...turmasAtuais.filter(turma => (turma.id || turma.turmaId) !== turmaId), { id: turmaId, dataInicio, dataTermino, turno, status: dataTermino && new Date(dataTermino) < new Date() ? 'finalizada' : 'planejada' }]
        : turmasAtuais;
      
      firebase.firestore()
        .collection('cursos')
        .doc(usuarioAtual.id)
        .update({
          preco: preco,
          cargaHoraria: cargaHr,
          proximaTurma: dataTurma,
          turmas
        })
        .then(() => {
          if (window.registrarLogAudit) registrarLogAudit(`Atualizou Curso: ${usuarioAtual.nome}`, 'adm', {preco, cargaHr});
          showToast("Curso atualizado com sucesso!", "success");
          closeModal();
          fetchCursos();
          fetchLogs();
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  } else {
      const novoNome = document.getElementById('editNome').value;
      const novoEmail = document.getElementById('editEmail').value.trim().toLowerCase();
      const novoCpf = document.getElementById('editCpf').value;
      const novoOrgaoRg = document.getElementById('editOrgaoRg').value;
      const novoEndereco = document.getElementById('editEndereco').value;
      const novoCep = document.getElementById('editCep').value;
      const novoLogradouro = document.getElementById('editLogradouro').value;
      const novoNumero = document.getElementById('editNumero').value;
      const novoBairro = document.getElementById('editBairro').value;
      const novaCidade = document.getElementById('editCidade').value;
      const novaUf = document.getElementById('editUf').value.toUpperCase();
      const novoTelefone = document.getElementById('editTelefone').value;
      const novoTelefoneAlt = document.getElementById('editTelefoneAlt').value;
      const novoRg = document.getElementById('editRg').value;
      const novoNascimento = document.getElementById('editNascimento').value;
      const novaAtribuicao = document.getElementById('editAtribuicao').value;
      const cursoAluno = document.getElementById('editCursoAluno').value.trim();
      const turmaAluno = document.getElementById('editTurmaAluno').value.trim();
      const inicioAluno = document.getElementById('editInicioAluno').value;
      const terminoAluno = document.getElementById('editTerminoAluno').value;
      let vinculoAcademico = {};
      if (novaAtribuicao === 'aluno') {
        vinculoAcademico = await montarVinculoAcademico(cursoAluno, turmaAluno, inicioAluno, terminoAluno);
        if (!vinculoAcademico) {
          alert('Curso não encontrado. Informe um curso cadastrado.');
          return;
        }
      }
        const disciplinas = novaAtribuicao === 'professor' ? obterDisciplinasProfessorSelecionadas() : [];

        if (novaAtribuicao === 'professor' && disciplinas.length === 0) {
          document.getElementById('professorDisciplinasError').textContent = 'Selecione pelo menos uma disciplina.';
          return;
        }

            const disciplinasKeys = disciplinas.map(disciplina => `${disciplina.cursoId}::${disciplina.turmaId || 'sem-turma'}::${disciplina.nome}`);

      firebase.firestore()
        .collection('usuarios')
        .doc(usuarioAtual.id)
        .update({
          nome: novoNome,
          email: novoEmail,
          cpf: novoCpf,
          orgaoRg: novoOrgaoRg,
          endereco: novoEndereco,
          cep: novoCep,
          logradouro: novoLogradouro,
          numero: novoNumero,
          bairro: novoBairro,
          cidade: novaCidade,
          uf: novaUf,
          telefone: novoTelefone,
          telefoneAlt: novoTelefoneAlt,
          rg: novoRg,
          nascimento: novoNascimento,
          atribuicao: novaAtribuicao,
          cursoSolicitado: novaAtribuicao === 'aluno' ? cursoAluno : firebase.firestore.FieldValue.delete(),
          turmaId: novaAtribuicao === 'aluno' ? turmaAluno : firebase.firestore.FieldValue.delete(),
          dataInicio: novaAtribuicao === 'aluno' ? inicioAluno : firebase.firestore.FieldValue.delete(),
          dataTermino: novaAtribuicao === 'aluno' ? terminoAluno : firebase.firestore.FieldValue.delete(),
          ...(novaAtribuicao === 'aluno' ? vinculoAcademico : {
            disciplinas: firebase.firestore.FieldValue.delete(),
            disciplinasKeys: firebase.firestore.FieldValue.delete()
          }),
          disciplinas: novaAtribuicao === 'professor' ? disciplinas : firebase.firestore.FieldValue.delete(),
          disciplinasKeys: novaAtribuicao === 'professor' ? disciplinasKeys : firebase.firestore.FieldValue.delete()
        })
        .then(() => {
          if (window.registrarLogAudit) registrarLogAudit(`Editou o Usuário: ${novoNome} | ${novoCpf}`, 'adm', {novaAtribuicao});
          showToast("Usuário atualizado com sucesso!", "success");
          closeModal();
          findUsers(); // already calls fetchCursos but that's fine
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  }
});

// Função de Toast (Substitui os alerts nativos)
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Excluir usuário
document.getElementById('deleteButton').addEventListener('click', function() {
  if (!usuarioAtual) return;
  if (confirm(`Excluir ${usuarioAtual.nome}?`)) {
    const nomeExcluido = usuarioAtual.nome;
    const cpfExcluido = usuarioAtual.cpf;
    
    firebase.firestore()
      .collection('usuarios')
      .doc(usuarioAtual.id)
      .delete()
      .then(() => {
        if (window.registrarLogAudit) registrarLogAudit(`Excluiu o Usuário: ${nomeExcluido} | ${cpfExcluido}`, 'adm', {});
        showToast("Usuário excluído!", "success");
        closeModal();
        findUsers();
      })
      .catch(error => {
        showToast("Erro ao excluir: " + error.message, "error");
      });
  }
});
