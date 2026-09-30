// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
    authDomain: "themis-154d1.firebaseapp.com",
    projectId: "themis-154d1",
    storageBucket: "themis-154d1.firebasestorage.app",
    messagingSenderId: "1017306886601",
    appId: "1:1017306886601:web:3b7f5057515d244c2bb818",
    measurementId: "G-3G0VW26WD9"
};

// Inicialize o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}



const db = firebase.firestore();

// O objeto 'form' para fácil acesso aos elementos
const form = {
    nascimento: () => document.getElementById('nascimento'),
    cpf: () => document.getElementById('cpf'),
    rg: () => document.getElementById('rg'),
    telefone: () => document.getElementById('telefone'),
    nome: () => document.getElementById('nome'),
    estadoCivil: () => document.getElementById('estadoCivil'),
    cep: () => document.getElementById('cep'),
    numero: () => document.getElementById('numero'),
    logradouro: () => document.getElementById('logradouro'),
    bairro: () => document.getElementById('bairro'),
    cidade: () => document.getElementById('cidade'),
    uf: () => document.getElementById('uf'),
    atribuicao: () => document.getElementById('atribuicao'),
}

// Verifica o estado de autenticação e dados do usuário
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (!userDoc.exists) {
            openModal();
            return;
        }

        const dados = userDoc.data() || {};
        if (String(dados.atribuicao || '').toLowerCase() !== 'aluno') {
            redirecionarPorAtribuicao(dados.atribuicao);
            return;
        }

        document.getElementById('studentDashboard').hidden = false;
        preencherPainelAcademico(dados, user);

        if (dados.nome || dados.nomeCompleto) {
            const primeiroNome = String(dados.nome || dados.nomeCompleto).split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => {
                const perfilLink = document.createElement('a');
                perfilLink.href = '/meuPerfil/meu_perfil.html';
                perfilLink.title = 'Ver Meu Perfil';
                perfilLink.style.color = 'inherit';
                perfilLink.style.textDecoration = 'none';
                perfilLink.textContent = `Olá, ${primeiroNome}`;

                const perfilIcon = document.createElement('i');
                perfilIcon.className = 'fa fa-user-circle';
                perfilIcon.style.marginLeft = '6px';

                el.replaceChildren(perfilLink, perfilIcon);
            });
        }
    } catch (error) {
        console.error('Erro ao verificar acesso à área do aluno:', error);
        window.location.href = '/login/login.html';
    }
});

// Função para abrir o modal
function openModal() {
    document.getElementById('userModal').style.display = 'flex';
}

const disciplinasPadrao = {
    vigilante: ['Noções de Segurança Privada', 'Legislação Aplicada e Direitos Humanos', 'Relações Humanas no Trabalho', 'Sistema de Segurança Pública e Crime Organizado', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Educação Física', 'Defesa Pessoal', 'Armamento e Tiro', 'Vigilância', 'Radiocomunicação e Alarmes', 'Noções de Segurança Eletrônica', 'Uso Progressivo da Força', 'Gerenciamento de Crises'],
    escoltaArm: ['Legislação Aplicada', 'Escolta Armada', 'Resolução de Situações de Emergência', 'Armamento e Tiro', 'Verificação de Aprendizagem'],
    grandesEventos: ['Papel do Vigilante na Estrutura de Segurança em Recintos de Grandes Eventos', 'Controle de Acesso', 'Gerenciamento de Público', 'Gestão de Multidões e Manutenção de Ambiente Seguro', 'Resolução de Situações de Emergência', 'Disciplinas Complementares'],
    Reciclagem: ['Revisão e Atualização das Disciplinas Básicas', 'Armamento e Tiro', 'Relações Humanas no Trabalho', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Defesa Pessoal'],
    armasNaoLetais: ['Uso Progressivo da Força', 'Agentes Químicos e Espargidores', 'Armas de Condutividade Elétrica', 'Primeiros Socorros']
};

async function preencherPainelAcademico(dados, user) {
    const primeiroNome = (dados.nome || user.email || 'aluno').split(' ')[0];
    const studentName = document.getElementById('student-name');
    if (studentName) studentName.textContent = primeiroNome;

    const cursoAluno = dados.cursoSolicitado || dados.curso || '';
    const courseName = document.getElementById('course-name');
    const courseStatus = document.getElementById('course-status');
    if (!cursoAluno) {
        courseName.textContent = 'Curso ainda não vinculado';
        courseStatus.textContent = 'A secretaria ainda não vinculou um curso à sua matrícula.';
        renderizarDisciplinas([]);
        return;
    }

    try {
        const cursosSnapshot = await db.collection('cursos').get();
        const cursoEncontrado = cursosSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .find(curso => curso.id === cursoAluno || curso.nome === cursoAluno || curso.nome?.toLowerCase() === cursoAluno.toLowerCase());
        const nomeCurso = cursoEncontrado?.nome || cursoAluno;
        courseName.textContent = nomeCurso;
        const turma = cursoEncontrado?.turmas?.find(item => (item.id || item.turmaId) === dados.turmaId);
        const dataInicio = dados.dataInicio || turma?.dataInicio || cursoEncontrado?.dataInicio;
        const dataTermino = dados.dataTermino || turma?.dataTermino || turma?.dataFim || cursoEncontrado?.dataTermino || cursoEncontrado?.dataFim;
        const progresso = calcularProgressoCurso(dataInicio, dataTermino);
        document.getElementById('course-progress').textContent = `${progresso.percentual}%`;
        courseStatus.textContent = progresso.mensagem;

        const disciplinas = cursoEncontrado?.disciplinas || disciplinasPadrao[cursoEncontrado?.id] || [];
        renderizarDisciplinas(disciplinas);
    } catch (error) {
        console.error('Erro ao carregar dados acadêmicos:', error);
        courseName.textContent = cursoAluno;
        courseStatus.textContent = 'Não foi possível carregar a grade agora.';
        renderizarDisciplinas([]);
    }

    const notas = Array.isArray(dados.notas) ? dados.notas : [];
    document.getElementById('grade-count').textContent = notas.length;
    document.getElementById('grade-average').textContent = notas.length ? calcularMedia(notas) : '--';
    document.getElementById('attendance-value').textContent = dados.frequencia ? `${dados.frequencia}%` : '--';
}

function calcularProgressoCurso(dataInicio, dataTermino, hoje = new Date()) {
    const inicio = converterDataSomente(dataInicio);
    const termino = converterDataSomente(dataTermino);

    if (!inicio || !termino || termino < inicio) {
        return { percentual: 0, mensagem: 'As datas do curso ainda não foram definidas pela secretaria.' };
    }

    const inicioTimestamp = inicio.getTime();
    const terminoTimestamp = termino.getTime();
    const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const hojeTimestamp = hojeData.getTime();
    const duracao = terminoTimestamp - inicioTimestamp;

    if (hojeTimestamp <= inicioTimestamp) {
        return { percentual: 0, mensagem: `Curso inicia em ${formatarDataCurso(inicio)}.` };
    }

    if (hojeTimestamp >= terminoTimestamp) {
        return { percentual: 100, mensagem: `Curso encerrado em ${formatarDataCurso(termino)}.` };
    }

    const percentual = Math.round(((hojeTimestamp - inicioTimestamp) / duracao) * 100);
    return {
        percentual: Math.max(0, Math.min(100, percentual)),
        mensagem: `Curso em andamento. Término previsto para ${formatarDataCurso(termino)}.`
    };
}

function converterDataSomente(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const texto = String(value).slice(0, 10);
    const partes = texto.split('-').map(Number);
    if (partes.length !== 3 || partes.some(Number.isNaN)) return null;

    const [ano, mes, dia] = partes;
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

function formatarDataCurso(data) {
    return data.toLocaleDateString('pt-BR');
}

function calcularMedia(notas) {
    const valores = notas.map(nota => Number(nota.nota ?? nota)).filter(nota => !Number.isNaN(nota));
    if (!valores.length) return '--';
    return (valores.reduce((total, nota) => total + nota, 0) / valores.length).toFixed(1).replace('.', ',');
}

function renderizarDisciplinas(disciplinas) {
    const lista = document.getElementById('discipline-list');
    if (!lista) return;
    lista.textContent = '';
    if (!disciplinas.length) {
        const vazio = document.createElement('p');
        vazio.className = 'empty-state';
        vazio.textContent = 'Nenhuma disciplina cadastrada para seu curso ainda.';
        lista.appendChild(vazio);
        return;
    }
    disciplinas.slice(0, 4).forEach((disciplina, index) => {
        const nome = typeof disciplina === 'string' ? disciplina : disciplina.nome;
        const item = document.createElement('div');
        item.className = 'discipline-item';
        const number = document.createElement('span');
        number.className = 'discipline-number';
        number.textContent = String(index + 1).padStart(2, '0');
        const title = document.createElement('span');
        title.textContent = String(nome || 'Disciplina');
        const status = document.createElement('span');
        status.className = 'discipline-state';
        status.textContent = String((typeof disciplina === 'object' && disciplina.status) || 'Em andamento');
        item.append(number, title, status);
        lista.appendChild(item);
    });
}

// Função para fechar o modal
function closeModal() {
   document.getElementById('userModal').style.display = 'none';
}

// Função para cadastrar dados no Firestore
async function cadastrarDados(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("Nenhum usuário autenticado.");
        return;
    }
    
    // Valida se todos os campos obrigatórios estão preenchidos
    if (!validarCamposObrigatorios()) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    
    const enderecoCompleto = `${form.logradouro().value}, ${form.numero().value} - ${form.bairro().value}, ${form.cidade().value}/${form.uf().value}`;

    const userData = {
        nome: form.nome().value,
        cpf: form.cpf().value,
        rg: form.rg().value,
        telefone: form.telefone().value,
        nascimento: form.nascimento().value,
        estadoCivil: form.estadoCivil().value,
        cep: form.cep().value,
        logradouro: form.logradouro().value,
        numero: form.numero().value,
        bairro: form.bairro().value,
        cidade: form.cidade().value,
        uf: form.uf().value,
        endereco: enderecoCompleto,
        atribuicao: form.atribuicao().value,
        user: {
            uid: firebase.auth().currentUser.uid,
        },
        dataCadastro: new Date().toISOString().slice(0, 10) // Salva a data do cadastro automaticamente
    };

    try {
        await db.collection('usuarios').doc(user.uid).set(userData);
        console.log("Dados do usuário salvos com sucesso!");
        alert('Cadastro realizado com sucesso! Seja bem-vindo.');
        closeModal();
        window.location.reload();
    } catch (error) {
        console.error("Erro ao salvar os dados do usuário:", error);
        alert("Erro ao cadastrar. Tente novamente.");
    }
}

// Função para validar todos os campos obrigatórios
function validarCamposObrigatorios() {
    const camposObrigatorios = [
        form.nome(),
        form.nascimento(),
        form.cpf(),
        form.rg(),
        form.telefone(),
        form.cep(),
        form.numero(),
        form.logradouro(),
        form.bairro(),
        form.cidade(),
        form.uf(),
        form.atribuicao(),
    ];
    
    let todosPreenchidos = true;
    
    camposObrigatorios.forEach(campo => {
        if (!campo.value.trim()) {
            // Destaca o campo vazio
            campo.style.border = '2px solid red';
            // Mostra mensagem de erro se existir
            const errorElement = document.getElementById(campo.id + 'Error');
            if (errorElement) {
                errorElement.textContent = 'Este campo é obrigatório';
            }
            todosPreenchidos = false;
        } else {
            // Remove o destaque se o campo estiver preenchido
            campo.style.border = '';
            // Limpa mensagem de erro
            const errorElement = document.getElementById(campo.id + 'Error');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    });
    
    return todosPreenchidos;
}

// Adicione o listener de evento para a função cadastrarDados() no formulário
document.addEventListener('DOMContentLoaded', () => {
    const disciplineButton = document.getElementById('discipline-button');
    if (disciplineButton) disciplineButton.addEventListener('click', () => {
        window.location.href = '/disciplinas/disciplinas.html';
    });

    const userForm = document.getElementById('userRegisterForm');
    if (userForm) {
        userForm.addEventListener('submit', cadastrarDados);
        
        // Adiciona evento para remover o destaque quando o usuário começar a digitar
        const inputs = userForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.style.border = '';
                    const errorElement = document.getElementById(this.id + 'Error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
            });
        });

        // Preenche dados do endereço automaticamente quando o CEP é completo
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('input', function() {
                const somenteDigitos = this.value.replace(/\D/g, '');
                if (somenteDigitos.length === 8) {
                    buscarEnderecoPorCep(somenteDigitos);
                }
            });
        }
    }

    // Verifica se deve abrir o modal de cadastro
    if (localStorage.getItem('abrirModalCadastro') === 'true') {
        openModal();
        localStorage.removeItem('abrirModalCadastro');
    }

    // Toggle menu mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// Função para adicionar item ao carrinho
function addToCart(name, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ name, price });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Item adicionado ao carrinho!');
}

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Busca de endereço automático pelo CEP usando ViaCEP
async function buscarEnderecoPorCep(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        return;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (data.erro) {
            throw new Error('CEP não encontrado');
        }

        form.logradouro().value = data.logradouro || '';
        form.bairro().value = data.bairro || '';
        form.cidade().value = data.localidade || '';
        form.uf().value = data.uf || '';

        // Remove erros antigos se o CEP foi preenchido com sucesso
        ['logradouro', 'bairro', 'cidade', 'uf', 'cep'].forEach(fieldId => {
            const errorElement = document.getElementById(fieldId + 'Error');
            if (errorElement) errorElement.textContent = '';
        });
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        const cepError = document.getElementById('cepError');
        if (cepError) cepError.textContent = 'Não foi possível buscar o CEP. Verifique e tente novamente.';
    }
}

// Validação simples de CPF (sem mudanças)
function validarCPF(cpf) { /* ... */ }

// Validação simples de telefone (sem mudanças)
function validarTelefone(tel) { /* ... */ }

// Máscaras (sem mudanças)
function aplicarMascara(id, formatador) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', e => {
            e.target.value = formatador(e.target.value.replace(/\D/g, ''));
        });
    }
}

aplicarMascara('cpf', v => v.replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2'));

aplicarMascara('telefone', v => v.replace(/^(\d{2})(\d)/, '($1) $2')
                                  .replace(/(\d{5})(\d{1,4})$/, '$1-$2'));