const firebaseConfig = {
  apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
  authDomain: "themis-154d1.firebaseapp.com",
  projectId: "themis-154d1",
  storageBucket: "themis-154d1.firebasestorage.app",
  messagingSenderId: "1017306886601",
  appId: "1:1017306886601:web:3b7f5057515d244c2bb818",
  measurementId: "G-3G0VW26WD9"
};
// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const defaultProductImage = '/img/logo.png';
let disciplinasDisponiveis = [];

const mobileMenuButton = document.getElementById('mobile-menu-btn');
const navigationLinks = document.getElementById('nav-links');
if (mobileMenuButton && navigationLinks) {
    mobileMenuButton.addEventListener('click', () => {
        const isExpanded = navigationLinks.classList.toggle('active');
        mobileMenuButton.setAttribute('aria-expanded', String(isExpanded));
        mobileMenuButton.innerHTML = `<i class="fa-solid ${isExpanded ? 'fa-xmark' : 'fa-bars'}"></i>`;
    });
    navigationLinks.addEventListener('click', event => {
        if (event.target.closest('a, button')) {
            navigationLinks.classList.remove('active');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            mobileMenuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
    });
}

function getProdutoImagem(produto) {
    if (produto.imagem && produto.imagem.trim()) return produto.imagem;
    const nome = (produto.nome || '').toLowerCase();
    const desc = (produto.descricao || '').toLowerCase();

    if (nome.includes('uniform') || desc.includes('uniform')) return '/img/uniaula.png';
    if (nome.includes('kit')) return '/img/kit1.png';
    if (nome.includes('capacete')) return '/img/capacete.png';
    if (nome.includes('colete')) return '/img/colete.png';
    if (nome.includes('lanterna')) return '/img/lanterna.png';
    if (nome.includes('algema')) return '/img/algemas.png';
    if (nome.includes('cinto')) return '/img/cinto_tatico.jpg';
    if (nome.includes('coldre')) return '/img/coldre.png';
    if (nome.includes('mochila')) return '/img/mochilas.png';
    if (nome.includes('farda') || nome.includes('equipamento') || nome.includes('armamento')) return '/img/guns-notkill.png';
    return defaultProductImage;
}

// Verifica se o usuário tem permissão para acessar a página
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const dados = userDoc.data();

        if (dados && (dados.nome || dados.nomeCompleto)) {
            const nomeExibicao = dados.nome || dados.nomeCompleto;
            const pNome = String(nomeExibicao).split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
        }

        const atribuicao = dados ? dados.atribuicao : null;

        if (!atribuicao) {
            localStorage.setItem('abrirModalCadastro', 'true');
            window.location.href = "/home/home.html";
            return;
        }

        if (atribuicao === 'adm' || atribuicao === 'admin') {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && !document.getElementById('link-volta-adm')) {
                const li = document.createElement('li');
                li.id = 'link-volta-adm';
                const link = document.createElement('a');
                link.href = '/adm/adm.html';
                link.innerHTML = '<i class="fa-solid fa-crown" style="color:var(--orange);"></i> Painel Master';
                li.appendChild(link);

                const userGreeting = navLinks.querySelector('.user-greeting');
                if (userGreeting && userGreeting.nextSibling) {
                    navLinks.insertBefore(li, userGreeting.nextSibling);
                } else {
                    navLinks.appendChild(li);
                }
            }
        }

        if (atribuicao !== 'funcionario' && atribuicao !== 'admin' && atribuicao !== 'adm') {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/home/home.html';
            return;
        }

        carregarAlunos();
    } catch (error) {
        console.error('Erro ao verificar acesso ao painel de funcionários:', error);
        window.location.href = '/login/login.html';
    }
});

// Função para cadastrar ou editar aluno
document.getElementById("alunoForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const alunoId = document.getElementById("alunoId").value;
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value.trim().toLowerCase();
    const confirmEmail = document.getElementById("confirmEmail").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const cpf = document.getElementById("cpf").value;
    const rg = "";
    const orgaoRg = "";
    const telefone = document.getElementById("telefone").value;
    const telefoneAlt = document.getElementById("telefoneAlt").value;
    const nascimento = document.getElementById("nascimento").value;
    const cep = document.getElementById("cep").value.trim();
    const logradouro = document.getElementById("logradouro").value.trim();
    const numero = document.getElementById("numero").value.trim();
    const bairro = document.getElementById("bairro").value.trim();
    const cidade = document.getElementById("cidade").value.trim();
    const uf = document.getElementById("uf").value.trim().toUpperCase();
    const formaPagamento = document.getElementById("formaPagamento").value;
    const cursoSolicitado = document.getElementById("cursoSolicitado").value;
    const turmaId = document.getElementById("turmaId").value.trim();
    const dataInicio = document.getElementById("dataInicio").value;
    const dataTermino = document.getElementById("dataTermino").value;
    const turno = document.getElementById("turno").value;
    const endereco = montarEnderecoCompleto({ logradouro, numero, bairro, cidade, uf });

    const vinculoAcademico = await montarVinculoAcademico(cursoSolicitado, turmaId, dataInicio, dataTermino, turno);
    if (!vinculoAcademico) {
        alert('Curso não encontrado. Selecione um curso cadastrado antes de salvar o aluno.');
        return;
    }
    if (vinculoAcademico.disciplinasSemProfessor.length) {
        alert(`A matrícula exige professor responsável em todas as disciplinas. Pendentes: ${vinculoAcademico.disciplinasSemProfessor.join(', ')}.`);
        return;
    }
    const { disciplinasSemProfessor, ...vinculoAcademicoPersistido } = vinculoAcademico;

    const alunoData = { 
        nome: nome.trim(), 
        email, 
        cpf, 
        rg, 
        orgaoRg, 
        endereco,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        telefone, 
        telefoneAlt,
        formaPagamento,
        cursoSolicitado,
        turmaId,
        dataInicio,
        dataTermino,
        turno,
        nascimento,
        ...vinculoAcademicoPersistido
    };

    try {
        if (alunoId) {
            // Atualiza aluno existente
            await db.collection("usuarios").doc(alunoId).update(alunoData);
            await window.academicWorkflow.syncStudentRosters(db, alunoId, alunoData);
            if (window.registrarLogAudit) registrarLogAudit(`Atualizou Aluno: ${alunoData.nome}`, 'gestão', {alunoId});
            alert("Aluno atualizado com sucesso!");
        } else {
            if (email !== confirmEmail) {
                alert("Os e-mails não coincidem.");
                return;
            }
            if (password.length < 6 || password !== confirmPassword) {
                alert("As senhas devem coincidir e ter pelo menos 6 caracteres.");
                return;
            }

            // Usa uma instância secundária para não substituir a sessão do funcionário.
            await criarContaDoAluno(alunoData, password);
            if (window.registrarLogAudit) registrarLogAudit(`Cadastrou Aluno: ${alunoData.nome}`, 'gestão', {cpf: alunoData.cpf});
            alert("Aluno cadastrado com sucesso!");
        }
        document.getElementById("alunoForm").reset();
        fecharModalAluno();
        carregarAlunos();
    } catch (error) {
        console.error("Erro ao salvar aluno:", error);
        alert("Erro ao salvar aluno. Tente novamente.");
    }
});

function formatarCpf(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

function formatarTelefone(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 10) {
        return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, ddd, prefixo, sufixo) => {
            if (!sufixo) return `(${ddd}) ${prefixo}`;
            return `(${ddd}) ${prefixo}-${sufixo}`;
        });
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, prefixo, sufixo) => {
        if (!sufixo) return `(${ddd}) ${prefixo}`;
        return `(${ddd}) ${prefixo}-${sufixo}`;
    });
}

const cpfInput = document.getElementById('cpf');
if (cpfInput) {
    cpfInput.addEventListener('input', () => {
        cpfInput.value = formatarCpf(cpfInput.value);
    });
}

const telefoneInput = document.getElementById('telefone');
if (telefoneInput) {
    telefoneInput.addEventListener('input', () => {
        telefoneInput.value = formatarTelefone(telefoneInput.value);
    });
}

const telefoneAltInput = document.getElementById('telefoneAlt');
if (telefoneAltInput) {
    telefoneAltInput.addEventListener('input', () => {
        telefoneAltInput.value = formatarTelefone(telefoneAltInput.value);
    });
}

document.getElementById('cep').addEventListener('blur', buscarEnderecoPorCep);

async function buscarEnderecoPorCep() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    cepInput.value = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
        const endereco = await response.json();
        if (endereco.erro) throw new Error('CEP não encontrado.');

        document.getElementById('logradouro').value = endereco.logradouro || '';
        document.getElementById('bairro').value = endereco.bairro || '';
        document.getElementById('cidade').value = endereco.localidade || '';
        document.getElementById('uf').value = endereco.uf || '';
        atualizarEnderecoCompleto();
    } catch (error) {
        document.getElementById('logradouro').value = '';
        document.getElementById('bairro').value = '';
        document.getElementById('cidade').value = '';
        document.getElementById('uf').value = '';
        alert(error.message);
    }
}

document.getElementById('numero').addEventListener('input', atualizarEnderecoCompleto);

function atualizarEnderecoCompleto() {
    const endereco = montarEnderecoCompleto({
        logradouro: document.getElementById('logradouro').value,
        numero: document.getElementById('numero').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        uf: document.getElementById('uf').value
    });
    document.getElementById('endereco').value = endereco;
}

function montarEnderecoCompleto({ logradouro, numero, bairro, cidade, uf }) {
    return `${logradouro}, ${numero} - ${bairro}, ${cidade}/${uf}`.replace(/^,\s*|\s*[-,/]\s*$/g, '').trim();
}

async function montarVinculoAcademico(cursoInformado, turmaId, dataInicio, dataTermino, turno) {
    const cursosSnapshot = await db.collection('cursos').get();
    const valorCurso = String(cursoInformado || '').trim().toLowerCase();
    const cursoDoc = cursosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(curso => curso.id.toLowerCase() === valorCurso || String(curso.nome || '').toLowerCase() === valorCurso);
    if (!cursoDoc) return null;

    const turmas = Array.isArray(cursoDoc.turmas) ? cursoDoc.turmas : [];
    const turma = turmas.find(item => (item.id || item.turmaId) === turmaId) || (turmas.length === 1 ? turmas[0] : null);
    if (!turma) return null;
    const cursoNome = cursoDoc.nome || cursoDoc.id;
    const turmaFinal = turmaId || turma?.id || turma?.turmaId || '';
    if (!turmaFinal) return null;
    const { disciplines, missing } = await window.academicWorkflow.buildStudentDisciplineLinks(db, cursoDoc, turmaFinal);

    return {
        cursoId: cursoDoc.id,
        cursoSolicitado: cursoNome,
        turmaId: turmaFinal,
        dataInicio: turma.dataInicio || cursoDoc.dataInicio || '',
        dataTermino: turma.dataTermino || turma.dataFim || cursoDoc.dataTermino || cursoDoc.dataFim || '',
        turno: turma.turno || cursoDoc.turno || '',
        disciplinas: disciplines,
        disciplinasKeys: disciplines.map(item => item.disciplinaKey),
        professoresPorDisciplina: Object.fromEntries(disciplines.map(item => [item.disciplinaKey, item.professorId])),
        disciplinasSemProfessor: missing
    };
}

async function criarContaDoAluno(alunoData, password) {
    const createStudent = firebase.functions().httpsCallable('createStudentAccount');
    const result = await createStudent({
        ...alunoData,
        password,
        confirmPassword: document.getElementById('confirmPassword').value,
        confirmEmail: document.getElementById('confirmEmail').value.trim().toLowerCase()
    });
    return result.data.uid;
}

function configurarCamposDeConta(isNewStudent) {
    ["confirmEmailGroup", "passwordGroup", "confirmPasswordGroup"].forEach((groupId) => {
        const group = document.getElementById(groupId);
        if (group) group.style.display = isNewStudent ? "" : "none";
    });

    ["confirmEmail", "password", "confirmPassword"].forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.required = isNewStudent;
        field.disabled = !isNewStudent;
        if (!isNewStudent) field.value = "";
    });
}

// Função para carregar alunos na tabela
async function carregarAlunos() {
    const alunosTableBody = document.getElementById("alunosTableBody");
    if (!alunosTableBody) {
        console.error("Tabela de alunos não encontrada na tela!");
        return;
    }

    alunosTableBody.innerHTML = "";

    try {
        console.log("Buscando lista de alunos no Firestore...");

        let snapshot;
        try {
            snapshot = await db.collection("usuarios").where("atribuicao", "in", ["aluno", "Aluno"]).get();
        } catch (queryError) {
            console.warn("Consulta por atribuição falhou; tentando fallback completo.", queryError);
            snapshot = await db.collection("usuarios").get();
        }

        const listaAlunos = [];
        snapshot.forEach((doc) => {
            const dados = doc.data() || {};
            const atribuicao = String(dados.atribuicao || "").trim().toLowerCase();
            if (atribuicao === "aluno") {
                listaAlunos.push({ id: doc.id, ...dados });
            }
        });

        console.log("Total de alunos encontrados:", listaAlunos.length);

        if (listaAlunos.length === 0) {
            alunosTableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Nenhum aluno encontrado.</td></tr>";
            return;
        }

        listaAlunos.sort((a, b) => {
            const nomeA = a.nome || "";
            const nomeB = b.nome || "";
            return nomeA.localeCompare(nomeB);
        });

        listaAlunos.forEach((aluno) => {
            const row = document.createElement('tr');
            const values = [aluno.nome, aluno.cpf, aluno.nascimento || '--'];
            values.forEach((value, index) => {
                const cell = document.createElement('td');
                if (index === 0) {
                    const strong = document.createElement('strong');
                    strong.textContent = String(value || '');
                    cell.appendChild(strong);
                } else {
                    cell.textContent = String(value || '');
                }
                row.appendChild(cell);
            });

            const actions = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'action-btn edit-btn';
            editButton.title = 'Editar Aluno';
            editButton.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
            editButton.addEventListener('click', () => editarAluno(
                aluno.id, aluno.nome, aluno.email, aluno.cpf,
                aluno.endereco, aluno.cep, aluno.logradouro, aluno.numero, aluno.bairro,
                aluno.cidade, aluno.uf, aluno.telefone, aluno.telefoneAlt, aluno.cursoSolicitado,
                aluno.turmaId || '', aluno.nascimento || '', aluno.dataInicio, aluno.dataTermino || '',
                aluno.formaPagamento, aluno.turno || ''
            ));

            const contractButton = document.createElement('button');
            contractButton.type = 'button';
            contractButton.className = 'action-btn doc-btn';
            contractButton.title = 'Gerar Contrato PDF';
            contractButton.innerHTML = '<i class="fa-solid fa-file-signature" aria-hidden="true"></i>';
            contractButton.addEventListener('click', () => criarContrato(
                aluno.nome, aluno.nascimento || aluno.idade || '', aluno.cpf, aluno.rg, aluno.orgaoRg, aluno.endereco,
                aluno.telefone, aluno.telefoneAlt, aluno.formaPagamento, aluno.cursoSolicitado,
                aluno.dataInicio, aluno.turno || ''
            ));

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'action-btn delete-btn';
            deleteButton.title = 'Excluir Aluno';
            deleteButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
            deleteButton.addEventListener('click', () => excluirAluno(aluno.id));

            actions.append(editButton, contractButton, deleteButton);
            row.appendChild(actions);
            alunosTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        alunosTableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>Erro ao recarregar a lista.</td></tr>";
    }
}

// Função para preencher o formulário com os dados do aluno para edição
async function editarAluno(id, nome, email, cpf, endereco, cep, logradouro, numero, bairro, cidade, uf, telefone, telefoneAlt, cursoSolicitado, turmaId, nascimento, dataInicio, dataTermino, formaPagamento, turnoParam) {
    configurarCamposDeConta(false);
    await carregarOpcoesCursosAluno(cursoSolicitado);
    document.getElementById("alunoId").value = id;
    document.getElementById("nome").value = nome;
    document.getElementById("email").value = email;
    document.getElementById("cpf").value = cpf;
    document.getElementById("endereco").value = endereco || '';
    document.getElementById("cep").value = cep || '';
    document.getElementById("logradouro").value = logradouro || '';
    document.getElementById("numero").value = numero || '';
    document.getElementById("bairro").value = bairro || '';
    document.getElementById("cidade").value = cidade || '';
    document.getElementById("uf").value = uf || '';
    document.getElementById("telefone").value = telefone;
    document.getElementById("telefoneAlt").value = telefoneAlt || '';
    document.getElementById("formaPagamento").value = formaPagamento || '';
    document.getElementById("cursoSolicitado").value = cursoSolicitado || '';
    await carregarOpcoesTurmasAluno(cursoSolicitado || '', turmaId || '');
    document.getElementById("dataInicio").value = dataInicio || '';
    document.getElementById("dataTermino").value = dataTermino || '';
    document.getElementById("turno").value = turnoParam || '';
    document.getElementById("nascimento").value = nascimento || '';

    // Modifica titulo e abre modal
    const mt = document.getElementById('modalAlunoTitle');
    if (mt) mt.innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Aluno';
    const m = document.getElementById('modalAluno');
    if (m) m.classList.add('active');
}

// Função para excluir aluno
async function excluirAluno(id) {
    if (confirm("Tem certeza que deseja excluir este aluno?")) {
        try {
            await db.collection("usuarios").doc(id).delete();
            if (window.registrarLogAudit) registrarLogAudit(`Excluiu Aluno ID: ${id}`, 'gestão', {id});
            alert("Aluno excluído com sucesso!");
            carregarAlunos();
        } catch (error) {
            console.error("Erro ao excluir aluno:", error);
            alert("Erro ao excluir aluno. Tente novamente.");
        }
    }
}

// Listener btnCursos desativado pós-migração para abas

// Carregamento agora ocorre após autenticação (onAuthStateChanged)

// Função para criar contrato em PDF
function criarContrato(nome, nascimento, cpf, rg, orgaoRg, endereco, telefone, telefoneAlt, formaPagamento, cursoSolicitado, dataInicio, turno) {
    if (window.registrarLogAudit) registrarLogAudit(`Gerou Contrato: ${nome}`, 'gestão', {cursoSolicitado});
    const idade = calcularIdade(nascimento);
    const rgNumero = String(rg || '').trim();
    const orgaoExpedidor = String(orgaoRg || '').trim();
    const documentoTexto = rgNumero || orgaoExpedidor
        ? `, ${rgNumero ? `RG nº ${rgNumero}` : 'RG não informado'}${orgaoExpedidor ? ` - ${orgaoExpedidor}` : ''}`
        : '';
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    // Carrega a logo e gera o PDF após carregar
    const img = new Image();
    img.src = "/img/logo.png";
    img.onload = function () {
        // Adiciona a logo no topo
        doc.addImage(img, "PNG", 80, 8, 50, 40); // x, y, largura, altura

        // Texto do contrato com marcadores
        let contrato = `

THÉMIS – ACADEMIA DE FORMAÇÃO DE VIGILANTES LTDA/EPP
CONTRATO DE PRESTAÇÃO DE SERVIÇOS
Pelo presente instrumento particular o Sr(a) NNN, IIII anos, CPF Nº CCC${documentoTexto}, residente na EEE , TELEFONE: TTT1, GGG2, Doravante Denominado CONTRATANTE e a THÉMIS – ACADEMIA DE FORMAÇÃO DE VIGILANTES LTDA-EPP, nome fantasia THÉMIS – ACADEMIA DE FORMAÇÃO DEVIGILANTES, inscrita no CNPJ 26.489.471/0001-07, autorizada  a    funcionar pelo   DEPARTAMENTO de POLICIA FEDERAL, conforme alvará Nº 4.733/17 , estabelecida na Avenida JK Qd. 12 Lote 16 Sala 2B – Jardim Brasília –Águas Lindas – GO, doravante denominada CONTRATADA, resolvem celebrar o presente contrato de prestação de serviços, conforme cláusulas a seguir:
CLÁUSULA PRIMEIRA – DO OBJETO
O objeto deste contrato consiste na prestação de serviços, pela contratada, a realização do curso pelo (a) contratante, conforme especificação contida abaixo e de acordo com a legislação vigente:	
CURSO SOLICITADO: AAA
DATA DE INICIO: DDD                                                                         TURNO: TTTT 08:30 – 17:00
PARAGRAFO ÚNICO: A data de inicio do curso PODERÁ ser alterada, considerando que esta academia se resguarda a iniciar turmas com, no MÍNIMO 	de 10 (DEZ) alunos e os cursos serão ministrados de segunda-feira a sexta-feira, sendo que, independente do turno escolhido, poderá haver aulas aos SÁBADOS, dependendo da carga horária do curso solicitado.
CLÁUSULA SEGUNDA – PREÇO E CONDIÇÕES DE PAGAMENTO
CONDIÇÕES DE PAGAMENTO:
PPP

O não cumprimento das condições de pagamento especificadas acima, ficará o (a) CONTRATANTE sujeito às seguintes penalidades:
1 – Suspensão do (a) CONTRATANTE das AULAS, até a quitação da (s) parcela (s) em aberto (vencidas);
2 – Retenção do CERTIFICADO ou DECLARAÇÃO de Conclusão até a quitação de todas as pendências;
3 – Multa de 2% (dois por cento) e JUROS de 1% (um por cento ao mês) sobre o valor da parcela em aberto;
PARÁGRAFO ÚNICO:A (O) CONTRATANTE AUTORIZA que os títulos sejam descontados na rede Bancária.
CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES
A CONTRATADA se obriga a formar ou reciclar Vigilantes, dentro das normas legais, deixando-os APTOS e PREPARADOS para o Exercício da Profissão e providenciar o registro do VIGILANTE junto ao Departamento de Policia Federal (DPF);
O (A) CONTRATANTE fica ciente que o prazo de registro no certificado/declaração é determinado pelo DPF. Sendo de, até, 60 (sessenta)  uteis, após o termino do curso.
O (A) CONTRATANTE deve seguir as seguintes obrigações:
1 – Participação nas aulas PRÁTICAS e TEÓRICAS, nos dias e horários especificados neste documento, SERÃO DE 100%, ou seja, PRESENÇA INTEGRAL, onde, HAVENDO  ocorrência, ESTA,  será avaliada pelos diretores da Academia (contratada), com a possibilidade de reprovação do (a) Aluno (a) Contratante.
2 – Obter nota mínima de 06 (seis) nas avaliações para aprovação.

3 – O ALUNO ATESTA QUE:
RESPONDE OU ESTÁ RESPONDENDO A PROCESSO CRIMINAL? PRINCIPALMENTE MARIA DA PENHA? (  ) SIM  (  ) NÂO                           
 ESTÁ QUITE COM A JUSTIÇA ELEITORAL? (  ) SIM (  ) NÃO       ESTÁ RESPONDENDO A PROCESSO CRIMINAL ELEITORAL  (  ) SIM  (  ) NÃO
POSSUI ENSINO FUNDAMENTAL COMPLETO? (  ) SIM  (  ) NÃO    
DIANTE DAS AFIRMAÇÕES CONTIDAS NO ITEM III, CONFIRMO ESTAR CIENTE DAS SANÇÕES EM CASO DE OMISSÃO DA VERDADE.
ASSINATURA DO ALUNO___________________________________________________________________________________________________________           
4 -Apresentar a documentação solicitada até a data de inicio do referido curso, sob pena, do aluno (a) ser considerado REPROVADO.
5 – Obedecer às normas impostas pela CONTRATADA quanto a boa conduta social e ética dentro das dependências da Academia e nas de pendências do prédio onde está instalada a sede da mesma. Sendo detectada a má conduta do (a) aluno (contratante) este, poderá ter a sua exclusão do curso;
6 – O contratante fica responsável por seus objetos pessoais dentro das instalações da Academia (contatada), portanto, fica a CONTRATADA ISENTA de responsabilidade no caso de roubo, perda ou quebra de qualquer objeto;
CLÁUSULA QUARTA – DA RECISÃO CONTRATUAL
O contrato poderá ser rescindido a qualquer momento, pelos seguintes motivos:
1 – Desistência do (a) CONTRATANTE, sendo que, no caso da desistência ocorrer até 02 (dois)dias APÓS o início do curso, a CONTRATADA terá direito,  a título  de indenização, o percentual de 40% (QUARENTA por cento) do valor do curso e devolverá os títulos das parcelas vencidas e os documentos apresentados, ou no caso do pedido de desistência ocorrer após o segundo dia de curso, não haverá devolução dos valores já PAGOS e o (a) CONTRATANTE ficará responsável pelo pagamento das parcelas vencidas;
2 – Inviabilidade do registro ou declaração de conclusão junto ao DPF, devido a não apresentação exigida pela Legislação Vigente pelo CONTRATANTE ou por Antecedentes Criminais, ficando o (a) mesmo (a) sem direito a devolução dos valores pagos e responsável pelo pagamento das parcelas vencidas;
3 – Descumprimento do contido nas cláusulas SEGUNDA e QUARTA pelo (a) CONTRATANTE, ficando (a) mesmo (a) sem direito a devolução dos valores pagos e responsável pelo pagamento das parcelas vencidas;
4 – Descumprimento pela CONTRATADA de suas obrigações descritas na cláusula SEGUNDA, havendo a devolução, ao CONTRATANTE, de todos os valores pagos e, bem como, dos títulos vencidos e de toda a documentação apresentada para a matrícula.
CLÁUSULA QUINTA – VIGÊNCIA
Para pagamento parcelado, este Contrato vigorará a partir da realização da matrícula até a quitação de todas as parcelas descritas nas condições de pagamento e, conseqüente, entrega do certificado ou declaração registrados no DPF;
Para pagamento á vista, o contrato vigorará a partir da realização da matrícula até a entrega do certificado ou Declaração DEVIDAMENTE registrado no DPF.
CLÁUSULA SEXTA – DO FORO
As partes elegem o foro de Águas Lindas de Goiás-GO, para dirimir quaisquer controvérsias existentes em relação ao presente Contrato, em detrimento de outro, por mais privilegiado que seja.
Assim, por estarem justas e contratadas, as partes assinam o presente contrato em duas vias de igual teor.

Águas Lindas de Goiás-GO, em  09 de JULHO de 2025.


`;

        // Substitui os marcadores pelos dados do aluno
        contrato = contrato
            .replace(/NNN/g, nome)
            .replace(/IIII/g, idade)
            .replace(/CCC/g, cpf)
            .replace(/EEE/g, endereco)
            .replace(/TTT1/g, telefone)
            .replace(/GGG2/g, telefoneAlt)
            .replace(/PPP/g, formaPagamento)
            .replace(/DDD/g, dataInicio)
            .replace(/TTTT/g, turno)
            .replace(/AAA/g, cursoSolicitado);

        // Quebra o texto em linhas para o PDF
        const linhas = contrato.split('\n');

        // Títulos para destacar (mas agora só em negrito, cor preta)
        const titulos = [
            "THÉMIS – ACADEMIA DE FORMAÇÃO DE VIGILANTES LTDA/EPP",
            "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
            "CLÁUSULA PRIMEIRA – DO OBJETO",
            "CLÁUSULA SEGUNDA – PREÇO E CONDIÇÕES DE PAGAMENTO",
            "CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES",
            "CLÁUSULA QUARTA – DA RECISÃO CONTRATUAL",
            "CLÁUSULA QUINTA – VIGÊNCIA",
            "CLÁUSULA SEXTA – DO FORO"
        ];

        let y = 35; // Começa abaixo da logo
        linhas.forEach(linha => {
            let texto = linha.trim();
            if (titulos.some(t => texto.startsWith(t))) {
                doc.setFont("times", "bold");
                doc.setFontSize(13);
                doc.setTextColor(0, 0, 0);
            } else {
                doc.setFont("times", "normal");
                doc.setFontSize(11.5);
                doc.setTextColor(0, 0, 0);
            }
            // Quebra linhas longas automaticamente
            const partes = doc.splitTextToSize(texto, 180);
            partes.forEach(parte => {
                doc.text(parte, 15, y);
                y += 7;
                // Se chegar ao fim da página, cria nova página
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            });
        });

        // Espaço para assinatura
        y += 10;
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.line(15, y, 90, y); // Linha para assinatura contratada
        doc.line(120, y, 195, y); // Linha para assinatura contratante
        doc.text("CONTRATADA", 35, y + 6);
        doc.text("CONTRATANTE", 145, y + 6);

        doc.save(`Contrato_${nome}.pdf`);
    };
}

function calcularIdade(nascimento) {
    if (!nascimento) return '';
    const dataNascimento = new Date(`${nascimento}T00:00:00`);
    if (Number.isNaN(dataNascimento.getTime())) return String(nascimento);

    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const aniversarioAindaNaoChegou = hoje.getMonth() < dataNascimento.getMonth()
        || (hoje.getMonth() === dataNascimento.getMonth() && hoje.getDate() < dataNascimento.getDate());
    if (aniversarioAindaNaoChegou) idade -= 1;
    return idade >= 0 ? String(idade) : '';
}

// Funcionalidade do modal
function fecharModalAluno() {
    const modalAluno = document.getElementById('modalAluno');
    if (modalAluno) modalAluno.classList.remove('active');
}

// Abrir modal aluno limpo
async function abrirModalAluno() {
    document.getElementById("alunoForm").reset();
    configurarCamposDeConta(true);
    await carregarOpcoesCursosAluno();
    document.getElementById("alunoId").value = "";
    document.getElementById('modalAlunoTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar Aluno';
    document.getElementById('modalAluno').classList.add('active');
}

async function carregarOpcoesCursosAluno(cursoSelecionado = '') {
    const select = document.getElementById('cursoSolicitado');
    if (!select) return;
    select.innerHTML = '<option value="">Carregando cursos disponíveis...</option>';
    try {
        const snapshot = await db.collection('cursos').get();
        const cursoNormalizado = String(cursoSelecionado || '').trim().toLowerCase();
        const cursos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(curso => {
            const turmas = Array.isArray(curso.turmas) ? curso.turmas : [];
            const temTurma = turmas.some(turma => turma.id || turma.turmaId);
            const cursoJaSelecionado = curso.id.toLowerCase() === cursoNormalizado || String(curso.nome || '').toLowerCase() === cursoNormalizado;
            return temTurma && (cursoJaSelecionado || turmas.some(turma => turma.status !== 'finalizada'));
        }).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        select.innerHTML = '<option value="">Selecione um curso</option>';
        cursos.forEach(curso => {
            const option = document.createElement('option');
            const nomeCurso = curso.nome || 'Curso sem nome';
            option.value = curso.id || '';
            option.textContent = nomeCurso;
            option.title = nomeCurso;
            select.appendChild(option);
        });
        const opcaoEncontrada = Array.from(select.options).find(option => option.value.toLowerCase() === cursoNormalizado || option.textContent.toLowerCase() === cursoNormalizado);
        select.value = opcaoEncontrada ? opcaoEncontrada.value : '';
        await carregarOpcoesTurmasAluno(select.value, document.getElementById('turmaId')?.value || '');
    } catch (error) {
        console.error('Erro ao carregar cursos disponíveis:', error);
        select.innerHTML = '<option value="">Não foi possível carregar os cursos</option>';
    }
}

async function carregarOpcoesTurmasAluno(cursoId, turmaSelecionada = '') {
    const selectTurma = document.getElementById('turmaId');
    if (!selectTurma) return;

    selectTurma.innerHTML = '<option value="">Selecione uma turma</option>';
    if (!cursoId) return;

    try {
        const cursoDoc = await db.collection('cursos').doc(cursoId).get();
        const curso = cursoDoc.exists ? { id: cursoDoc.id, ...cursoDoc.data() } : null;
        const turmas = Array.isArray(curso?.turmas) ? curso.turmas : [];

        if (!turmas.length) {
            selectTurma.innerHTML = '<option value="">Nenhuma turma cadastrada</option>';
            return;
        }

        turmas.forEach(turma => {
            const idTurma = turma.id || turma.turmaId || '';
            if (!idTurma) return;
            const option = document.createElement('option');
            option.value = idTurma;
            option.textContent = idTurma;
            selectTurma.appendChild(option);
        });

        const turmaEncontrada = Array.from(selectTurma.options).find(option => option.value === turmaSelecionada);
        selectTurma.value = turmaEncontrada ? turmaEncontrada.value : selectTurma.options[1]?.value || '';
    } catch (error) {
        console.error('Erro ao carregar turmas do curso:', error);
        selectTurma.innerHTML = '<option value="">Não foi possível carregar as turmas</option>';
    }
}

const selectCursoSolicitado = document.getElementById('cursoSolicitado');
if (selectCursoSolicitado) {
    selectCursoSolicitado.addEventListener('change', async () => {
        await carregarOpcoesTurmasAluno(selectCursoSolicitado.value);
    });
}

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/login/login.html';
    });
}

// Funcionalidade de Abas (Tabs)
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        const isActive = tab.id === tabName;
        tab.classList.toggle('active', isActive);
        tab.hidden = !isActive;
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', String(btn.getAttribute('onclick') === `openTab('${tabName}')`));
    });

    document.getElementById(tabName).classList.add('active');
    
    // Ativa o botao
    if(tabName === 'tabAlunos') {
        document.querySelector('.tab-btn[onclick="openTab(\'tabAlunos\')"]').classList.add('active');
        carregarAlunos();
    } else if (tabName === 'tabCursos') {
        document.querySelector('.tab-btn[onclick="openTab(\'tabCursos\')"]').classList.add('active');
        carregarCursos();
    } else if (tabName === 'tabProfessores') {
        document.querySelector('.tab-btn[onclick="openTab(\'tabProfessores\')"]').classList.add('active');
        carregarProfessores();
    } else if (tabName === 'tabProdutos') {
        document.querySelector('.tab-btn[onclick="openTab(\'tabProdutos\')"]').classList.add('active');
        carregarProdutos();
    }
}

// --- LÓGICA DE GERENCIAMENTO DE PROFESSORES ---
async function carregarProfessores() {
    const tabela = document.getElementById('professoresTableBody');
    if (!tabela) return;
    tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando professores...</td></tr>';

    try {
        const [snapshot, disciplinesSnapshot] = await Promise.all([
            db.collection('usuarios').get(),
            db.collection('disciplinas').get()
        ]);
        const disciplineNames = new Map(disciplinesSnapshot.docs.map(doc => [doc.id, doc.data().nome || decodeURIComponent(doc.id)]));
        const professores = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(professor => String(professor.atribuicao || '').toLowerCase() === 'professor')
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));

        tabela.innerHTML = '';
        if (!professores.length) {
            tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum professor cadastrado.</td></tr>';
            return;
        }

        professores.forEach(professor => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const name = document.createElement('strong');
            name.textContent = String(professor.nome || '--');
            nameCell.appendChild(name);
            const emailCell = document.createElement('td');
            emailCell.textContent = String(professor.email || '--');
            const disciplinesCell = document.createElement('td');
            const disciplines = document.createElement('div');
            disciplines.className = 'discipline-chips';
            const items = Array.isArray(professor.disciplinasIds) ? professor.disciplinasIds : [];
            items.forEach(item => {
                const chip = document.createElement('span');
                chip.className = 'discipline-chip';
                chip.textContent = disciplineNames.get(item) || 'Disciplina';
                disciplines.appendChild(chip);
            });
            if (!items.length) {
                const empty = document.createElement('span');
                empty.className = 'no-disciplines';
                empty.textContent = 'Nenhuma disciplina vinculada';
                disciplines.appendChild(empty);
            }
            disciplinesCell.appendChild(disciplines);
            const actions = document.createElement('td');
            actions.append(
                criarBotaoAcao('edit-btn', 'Editar Professor', 'fa-solid fa-pen', () => editarProfessor(professor.id)),
                criarBotaoAcao('delete-btn', 'Excluir Professor', 'fa-solid fa-trash', () => excluirProfessor(professor.id))
            );
            row.append(nameCell, emailCell, disciplinesCell, actions);
            tabela.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar professores:', error);
        tabela.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ff6b1a;">Não foi possível carregar os professores.</td></tr>';
    }
}

async function carregarOpcoesDisciplinas() {
    const container = document.getElementById('professorDisciplinas');
    if (!container) return;
    container.innerHTML = '<span class="loading-option">Carregando disciplinas dos cursos...</span>';

    const coursesSnapshot = await db.collection('cursos').get();
    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await window.academicWorkflow.ensureCourseDisciplineRecords(db, courses);
    const snapshot = await db.collection('disciplinas').get();
    disciplinasDisponiveis = snapshot.docs.map(doc => {
        const discipline = doc.data() || {};
        const courseNames = (discipline.cursoIds || []).map(courseId =>
            courses.find(course => course.id === courseId)?.nome || courseId
        );
        return { chave: doc.id, cursoIds: discipline.cursoIds || [], cursoNome: courseNames.join(', '), nome: discipline.nome || doc.id };
    }).filter(item => item.cursoIds.length);
    renderizarOpcoesDisciplinas();
}

function renderizarOpcoesDisciplinas(selecionadas = []) {
    const container = document.getElementById('professorDisciplinas');
    if (!container) return;
    const chavesSelecionadas = new Set(selecionadas);
    container.innerHTML = '';
    if (!disciplinasDisponiveis.length) {
        container.innerHTML = '<span class="loading-option">Nenhuma disciplina foi cadastrada nos cursos ainda.</span>';
        atualizarContagemDisciplinas();
        return;
    }
    disciplinasDisponiveis.forEach(disciplina => {
        const label = document.createElement('label');
        label.className = 'discipline-option';
        label.innerHTML = `<input type="checkbox" value="${escapeHtml(disciplina.chave)}" ${chavesSelecionadas.has(disciplina.chave) ? 'checked' : ''}><span><strong>${escapeHtml(disciplina.nome)}</strong><small>${escapeHtml(disciplina.cursoNome)}</small></span>`;
        container.appendChild(label);
    });
    container.querySelectorAll('input').forEach(input => input.addEventListener('change', atualizarContagemDisciplinas));
    atualizarContagemDisciplinas();
}

function atualizarContagemDisciplinas() {
    const selecionadas = document.querySelectorAll('#professorDisciplinas input:checked').length;
    const contador = document.getElementById('discipline-selection-count');
    if (contador) contador.textContent = `${selecionadas} selecionada${selecionadas === 1 ? '' : 's'}`;
}

function obterDisciplinasSelecionadas() {
    return Array.from(document.querySelectorAll('#professorDisciplinas input:checked'))
        .map(input => input.value);
}

async function abrirModalProfessor(professorId = '') {
    document.getElementById('professorForm').reset();
    document.getElementById('professorId').value = professorId;
    document.getElementById('professorEmail').disabled = Boolean(professorId);
    document.getElementById('professorPassword').required = !professorId;
    document.getElementById('professorConfirmPassword').required = !professorId;
    document.getElementById('professorPasswordGroup').style.display = professorId ? 'none' : '';
    document.getElementById('professorConfirmPasswordGroup').style.display = professorId ? 'none' : '';
    document.getElementById('modalProfessorTitle').innerHTML = professorId
        ? '<i class="fa-solid fa-user-pen"></i> Editar Professor'
        : '<i class="fa-solid fa-chalkboard-user"></i> Adicionar Professor';
    await carregarOpcoesDisciplinas();

    if (professorId) {
        const professorDoc = await db.collection('usuarios').doc(professorId).get();
        const professor = professorDoc.data() || {};
        document.getElementById('professorNome').value = professor.nome || '';
        document.getElementById('professorEmail').value = professor.email || '';
        renderizarOpcoesDisciplinas(Array.isArray(professor.disciplinasIds) ? professor.disciplinasIds : []);
    }
    document.getElementById('modalProfessor').classList.add('active');
}

function fecharModalProfessor() {
    document.getElementById('modalProfessor').classList.remove('active');
}

async function editarProfessor(id) {
    await abrirModalProfessor(id);
}

async function excluirProfessor(id) {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;
    try {
        await db.collection('usuarios').doc(id).delete();
        alert('Professor excluído com sucesso!');
        carregarProfessores();
    } catch (error) {
        console.error('Erro ao excluir professor:', error);
        alert('Erro ao excluir professor. Tente novamente.');
    }
}

const professorForm = document.getElementById('professorForm');
if (professorForm) {
    professorForm.addEventListener('submit', async event => {
        event.preventDefault();
        const professorId = document.getElementById('professorId').value;
        const nome = document.getElementById('professorNome').value.trim();
        const email = document.getElementById('professorEmail').value.trim().toLowerCase();
        const disciplinasIds = obterDisciplinasSelecionadas();
        if (!disciplinasIds.length) {
            alert('Selecione pelo menos uma disciplina.');
            return;
        }

        try {
            const courseIds = [...new Set(disciplinasDisponiveis
                .filter(item => disciplinasIds.includes(item.chave))
                .flatMap(item => item.cursoIds))];
            if (professorId) {
                await db.collection('usuarios').doc(professorId).update({ nome });
                await firebase.functions().httpsCallable('updateTeacherAssignments')({ teacherId: professorId, disciplinasIds });
                alert('Professor atualizado com sucesso!');
            } else {
                const senha = document.getElementById('professorPassword').value;
                const confirmarSenha = document.getElementById('professorConfirmPassword').value;
                if (senha.length < 6 || senha !== confirmarSenha) {
                    alert('As senhas devem coincidir e ter pelo menos 6 caracteres.');
                    return;
                }
                await criarContaDeProfessor({ nome, email, disciplinasIds }, senha);
                alert('Professor cadastrado com sucesso!');
            }
            await Promise.all(courseIds.map(async courseId => {
                const courseDoc = await db.collection('cursos').doc(courseId).get();
                if (courseDoc.exists) await window.academicWorkflow.notifyCourseProfessors(db, courseId, { id: courseDoc.id, ...courseDoc.data() });
                await window.academicWorkflow.syncCourseStudentTeachers(db, courseId);
            }));
            fecharModalProfessor();
            carregarProfessores();
        } catch (error) {
            console.error('Erro ao salvar professor:', error);
            alert('Erro ao salvar professor. Verifique os dados e tente novamente.');
        }
    });
}

async function criarContaDeProfessor(professorData, password) {
    const createTeacher = firebase.functions().httpsCallable('createTeacherAccount');
    const result = await createTeacher({ ...professorData, password });
    return result.data.uid;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
}

function criarBotaoAcao(classe, titulo, icone, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-btn ${classe}`;
    button.title = titulo;
    button.innerHTML = `<i class="${icone}" aria-hidden="true"></i>`;
    button.addEventListener('click', handler);
    return button;
}

// --- LÓGICA DE GERENCIAMENTO DE CURSOS ---
async function carregarCursos() {
    const cursosTableBody = document.getElementById("cursosTableBody");
    if (!cursosTableBody) return;
    cursosTableBody.innerHTML = "";

    try {
        const snapshot = await db.collection("cursos").get();
        if (snapshot.empty) {
            initCursos();
            return;
        }

        snapshot.forEach((doc) => {
            const curso = doc.data();
            const row = document.createElement('tr');
            [curso.nome, `R$ ${curso.preco || '0,00'}`, curso.cargaHoraria || curso.cargaHr || '--', curso.dataTurma || curso.proximaTurma || '--'].forEach((value, index) => {
                const cell = document.createElement('td');
                if (index === 0) {
                    const name = document.createElement('strong');
                    name.textContent = String(value || '');
                    cell.appendChild(name);
                } else {
                    cell.textContent = String(value);
                }
                row.appendChild(cell);
            });
            const actions = document.createElement('td');
            actions.style.textAlign = 'center';
            actions.appendChild(criarBotaoAcao('edit-btn', 'Editar Curso', 'fa-solid fa-pen', () => editarCurso(
                doc.id, curso.nome, curso.preco, curso.cargaHoraria || curso.cargaHr, curso.dataTurma || curso.proximaTurma
            )));
            row.appendChild(actions);
            cursosTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar cursos:", error);
    }
}

// Preenche dados padrão se a coleção de cursos estiver vazia
async function initCursos() {
    const cursosPadrao = [
        { nome: 'Formação Básica de Vigilante', preco: '1.200,00', cargaHoraria: '200 Horas', dataTurma: 'Em Breve', disciplinas: ['Noções de Segurança Privada', 'Legislação Aplicada e Direitos Humanos', 'Relações Humanas no Trabalho', 'Sistema de Segurança Pública e Crime Organizado', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Educação Física', 'Defesa Pessoal', 'Armamento e Tiro', 'Vigilância', 'Radiocomunicação e Alarmes', 'Noções de Segurança Eletrônica', 'Uso Progressivo da Força', 'Gerenciamento de Crises'] },
        { nome: 'Reciclagem de Vigilantes', preco: '300,00', cargaHoraria: '40 Horas', dataTurma: 'A Definir', disciplinas: ['Revisão e Atualização das Disciplinas Básicas', 'Armamento e Tiro', 'Relações Humanas no Trabalho', 'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Defesa Pessoal'] },
        { nome: 'Extensão em Escolta Armada', preco: '550,00', cargaHoraria: '50 Horas', dataTurma: 'A Definir', disciplinas: ['Legislação Aplicada', 'Escolta Armada', 'Resolução de Situações de Emergência', 'Armamento e Tiro', 'Verificação de Aprendizagem'] },
        { nome: 'Curso de Extensão em Segurança para Grandes Eventos', preco: '450,00', cargaHoraria: '60 Horas', dataTurma: 'A Definir', disciplinas: ['Papel do Vigilante na Estrutura de Segurança em Recintos de Grandes Eventos', 'Controle de Acesso', 'Gerenciamento de Público', 'Gestão de Multidões e Manutenção de Ambiente Seguro', 'Resolução de Situações de Emergência', 'Disciplinas Complementares'] },
        { nome: 'Extensão ou Aperfeiçoamento em Armas Não Letais', preco: '500,00', cargaHoraria: '80 Horas', dataTurma: 'A Definir', disciplinas: ['Uso Progressivo da Força', 'Agentes Químicos e Espargidores', 'Armas de Condutividade Elétrica', 'Primeiros Socorros'] },
        { nome: 'Extensão em Transporte de Valores', preco: '550,00', cargaHoraria: '50 Horas', dataTurma: 'A Definir', disciplinas: ['Transporte de Valores', 'Direção Defensiva', 'Gerenciamento de Risco', 'Prevenção de Perdas'] },
        { nome: 'Segurança Pessoal Privada (VSPP)', preco: '650,00', cargaHoraria: '50 Horas', dataTurma: 'A Definir', disciplinas: ['Proteção de Pessoas', 'Análise de Risco', 'Direção Defensiva', 'Primeiros Socorros'] },
        { nome: 'Supervisor de Segurança', preco: '800,00', cargaHoraria: '40 Horas', dataTurma: 'A Definir', disciplinas: ['Gestão de Equipes', 'Legislação de Segurança', 'Elaboração de Relatórios', 'Gerenciamento de Crises'] }
    ];
    for (const curso of cursosPadrao) {
        await db.collection("cursos").add(curso);
    }
    carregarCursos();
}

function editarCurso(id, nome, preco, cargaHoraria, dataTurma) {
    document.getElementById("cursoId").value = id;
    document.getElementById("cursoNome").value = nome;
    document.getElementById("cursoPreco").value = preco || '';
    document.getElementById("cursoCargaHoraria").value = cargaHoraria || '';
    document.getElementById("cursoDataTurma").value = dataTurma || '';

    const modal = document.getElementById('modalCurso');
    if (modal) modal.classList.add('active');
}

function fecharModalCurso() {
    const modal = document.getElementById('modalCurso');
    if (modal) modal.classList.remove('active');
}

// Listener para o form do curso
const formCursos = document.getElementById("cursoForm");
if (formCursos) {
    formCursos.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = document.getElementById("cursoId").value;
        const preco = document.getElementById("cursoPreco").value;
        const cargaHoraria = document.getElementById("cursoCargaHoraria").value;
        const dataTurma = document.getElementById("cursoDataTurma").value;

        try {
            await db.collection("cursos").doc(id).update({
                preco,
                cargaHoraria,
                dataTurma
            });
            alert("Curso atualizado com sucesso!");
            fecharModalCurso();
            carregarCursos();
        } catch (error) {
            console.error("Erro ao atualizar curso:", error);
            alert("Falha ao atualizar curso. Tente novamente.");
        }
    });
}

// --- LÓGICA DE GERENCIAMENTO DE PRODUTOS ---
async function carregarProdutos() {
    const produtosTableBody = document.getElementById("produtosTableBody");
    if (!produtosTableBody) return;
    produtosTableBody.innerHTML = "";

    try {
        const snapshot = await db.collection("produtos").get();
        if (snapshot.empty) {
            initProdutos();
            return;
        }

        snapshot.forEach((doc) => {
            const produto = doc.data();
            const row = document.createElement('tr');
            const imageCell = document.createElement('td');
            imageCell.style.width = '60px';
            const image = document.createElement('img');
            image.src = getProdutoImagem(produto);
            image.alt = 'Produto';
            image.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 4px;';
            imageCell.appendChild(image);
            const values = [produto.idExt || '--', produto.nome || '--', `R$ ${produto.valorCusto || '0,00'} / R$ ${produto.preco || '0,00'}`, `${produto.estoque || '0'} un.`];
            const cells = values.map(value => {
                const cell = document.createElement('td');
                cell.textContent = String(value);
                return cell;
            });
            const name = document.createElement('strong');
            name.textContent = String(produto.nome || '--');
            cells[1].textContent = '';
            cells[1].appendChild(name);
            const actions = document.createElement('td');
            actions.style.textAlign = 'center';
            actions.append(
                criarBotaoAcao('edit-btn', 'Editar Produto', 'fa-solid fa-pen', () => editarProduto(
                    doc.id, produto.idExt || '', produto.nome, produto.preco, produto.valorCusto || '',
                    produto.estoque || '', produto.imagem || '', produto.descricao || ''
                )),
                criarBotaoAcao('delete-btn', 'Excluir Produto', 'fa-solid fa-trash', () => excluirProduto(doc.id))
            );
            row.append(imageCell, ...cells, actions);
            produtosTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

async function initProdutos() {
    const produtosPadrao = [
        { idExt: 'UNIF-001', nome: 'Uniformes', valorCusto: '75,00', preco: '150,00', estoque: '50', imagem: '/img/uniaula.png', descricao: 'Uniformes profissionais para vigilantes e equipes de segurança.' },
        { idExt: 'KIT-001', nome: 'Kit de Autodefesa', valorCusto: '100,00', preco: '200,00', estoque: '20', imagem: '/img/kit1.png', descricao: 'Equipamentos essenciais para sua proteção pessoal.' },
        { idExt: 'CAP-001', nome: 'Capacete de Segurança', valorCusto: '40,00', preco: '80,00', estoque: '30', imagem: '/img/capacete.png', descricao: 'Capacete resistente para proteção em operações de segurança.' },
        { idExt: 'COL-001', nome: 'Colete Balístico', valorCusto: '150,00', preco: '300,00', estoque: '15', imagem: '/img/colete.png', descricao: 'Colete de proteção contra projéteis para máxima segurança.' },
        { idExt: 'LAN-001', nome: 'Lanterna Tática', valorCusto: '20,00', preco: '50,00', estoque: '100', imagem: '/img/lanterna.png', descricao: 'Lanterna de alta potência para operações noturnas.' },
        { idExt: 'ALG-001', nome: 'Algemas', valorCusto: '15,00', preco: '40,00', estoque: '60', imagem: '/img/algemas.png', descricao: 'Algemas de aço inoxidável para contenção segura.' }
    ];
    for (const produto of produtosPadrao) {
        await db.collection("produtos").add(produto);
    }
    carregarProdutos();
}

function abrirModalProduto() {
    document.getElementById("produtoForm").reset();
    document.getElementById("produtoFirebaseId").value = "";
    document.getElementById('modalProdutoTitle').innerHTML = '<i class="fa-solid fa-box"></i> Adicionar Produto';
    document.getElementById('modalProduto').classList.add('active');
}

function fecharModalProduto() {
    const modal = document.getElementById('modalProduto');
    if (modal) modal.classList.remove('active');
}

function editarProduto(id, idExt, nome, preco, valorCusto, estoque, imagem, descricao) {
    document.getElementById("produtoFirebaseId").value = id;
    document.getElementById("produtoIdExt").value = idExt;
    document.getElementById("produtoNome").value = nome;
    document.getElementById("produtoPreco").value = preco;
    document.getElementById("produtoValorCusto").value = valorCusto;
    document.getElementById("produtoEstoque").value = estoque;
    document.getElementById("produtoImagem").value = imagem;
    document.getElementById("produtoDescricao").value = descricao;

    document.getElementById('modalProdutoTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Produto';
    document.getElementById('modalProduto').classList.add('active');
}

async function excluirProduto(id) {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
        try {
            await db.collection("produtos").doc(id).delete();
            if (window.registrarLogAudit) registrarLogAudit(`Excluiu Produto ID: ${id}`, 'gestão', {id});
            alert("Produto excluído com sucesso!");
            carregarProdutos();
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            alert("Erro ao excluir produto. Tente novamente.");
        }
    }
}

// Listener para o form de produto
const formProdutos = document.getElementById("produtoForm");
if (formProdutos) {
    formProdutos.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const id = document.getElementById("produtoFirebaseId").value;
        const produtoData = {
            idExt: document.getElementById("produtoIdExt").value,
            nome: document.getElementById("produtoNome").value,
            valorCusto: document.getElementById("produtoValorCusto").value,
            preco: document.getElementById("produtoPreco").value,
            estoque: document.getElementById("produtoEstoque").value,
            imagem: document.getElementById("produtoImagem").value,
            descricao: document.getElementById("produtoDescricao").value
        };

        try {
            if (id) {
                // Atualiza produto existente
                await db.collection("produtos").doc(id).update(produtoData);
                if (window.registrarLogAudit) registrarLogAudit(`Atualizou Produto: ${produtoData.nome}`, 'gestão', {idExt: produtoData.idExt});
                alert("Produto atualizado com sucesso!");
            } else {
                // Adiciona novo produto
                await db.collection("produtos").add(produtoData);
                if (window.registrarLogAudit) registrarLogAudit(`Criou Produto: ${produtoData.nome}`, 'gestão', {idExt: produtoData.idExt});
                alert("Produto cadastrado com sucesso!");
            }
            fecharModalProduto();
            carregarProdutos();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Falha ao salvar produto. Tente novamente.");
        }
    });
}
