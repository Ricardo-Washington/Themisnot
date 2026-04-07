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

// Verifica se o usuário tem permissão para acessar a página
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const dados = userDoc.data();
           // Injeta a saudacao do usuario na navbar
           if (dados && (dados.nome || dados.nomeCompleto)) {
               const nomeExibicao = dados.nome || dados.nomeCompleto;
               const pNome = nomeExibicao.split(' ')[0];
               document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
           }

        const atribuicao = dados ? dados.atribuicao : null;

        if (!atribuicao) {
            // Não tem atribuição, volta pra home e abre o modal de cadastro
            localStorage.setItem('abrirModalCadastro', 'true');
            window.location.href = "/home/home.html";
            return;
        }

        if (atribuicao !== "funcionario" && atribuicao !== "admin") {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = "/home/home.html";
        } else {
            // Se tiver permissão, aí sim carrega a base de dados
            carregarAlunos();
        }
    }
});

// Função para cadastrar ou editar aluno
document.getElementById("alunoForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const alunoId = document.getElementById("alunoId").value;
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const cpf = document.getElementById("cpf").value;
    const rg = document.getElementById("rg").value;
    const orgaoRg = document.getElementById("orgaoRg").value;
    const endereco = document.getElementById("endereco").value;
    const telefone = document.getElementById("telefone").value;
    const telefoneAlt = document.getElementById("telefoneAlt").value;
    const formaPagamento = document.getElementById("formaPagamento").value;
    const cursoSolicitado = document.getElementById("cursoSolicitado").value;
    const dataInicio = document.getElementById("dataInicio").value;
    const turno = document.getElementById("turno").value;
    const idade = document.getElementById("idade").value;

    const alunoData = { 
        nome, 
        email, 
        cpf, 
        rg, 
        orgaoRg, 
        endereco, 
        telefone, 
        telefoneAlt,
        formaPagamento,
        cursoSolicitado,
        dataInicio,
        turno,
        idade
    };

    try {
        if (alunoId) {
            // Atualiza aluno existente
            await db.collection("usuarios").doc(alunoId).update(alunoData);
            alert("Aluno atualizado com sucesso!");
        } else {
            // Cadastra novo aluno
            await db.collection("usuarios").add({ ...alunoData, atribuicao: "aluno" });
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

// Função para carregar alunos na tabela
async function carregarAlunos() {
    const alunosTableBody = document.getElementById("alunosTableBody");
    if(!alunosTableBody) {
        console.error("Tabela de alunos não encontrada na tela!");
        return;
    }
    alunosTableBody.innerHTML = "";

    try {
        console.log("Buscando lista de alunos no Firestore...");
        const snapshot = await db.collection("usuarios").where("atribuicao", "==", "Aluno").get();
        console.log("Total de alunos encontrados:", snapshot.size);
        
        if (snapshot.empty) {
            alunosTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum aluno encontrado.</td></tr>";
            return;
        }

        // Armazena alunos num array para ordenar localmente
        const listaAlunos = [];
        snapshot.forEach((doc) => {
            listaAlunos.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar alfabeticamente usando o campo "nome"
        listaAlunos.sort((a, b) => {
            const nomeA = a.nome || "";
            const nomeB = b.nome || "";
            return nomeA.localeCompare(nomeB);
        });

        listaAlunos.forEach((aluno) => {
            const row = `
                <tr>
                    <td><strong>${aluno.nome}</strong></td>
                    <td>${aluno.cpf || ''}</td>
                    <td>${aluno.rg || ''}</td>
                    <td>${aluno.idade || ''}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editarAluno('${aluno.id}', '${aluno.nome}', '${aluno.email}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.cursoSolicitado}', '${aluno.idade}', '${aluno.dataInicio}', '${aluno.formaPagamento}', '${aluno.turno || ''}')" title="Editar Aluno"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn doc-btn" onclick="criarContrato('${aluno.nome}', '${aluno.idade}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.formaPagamento}', '${aluno.cursoSolicitado}', '${aluno.dataInicio}', '${aluno.turno || ''}')" title="Gerar Contrato PDF"><i class="fa-solid fa-file-signature"></i></button>
                        <button class="action-btn delete-btn" onclick="excluirAluno('${aluno.id}')" title="Excluir Aluno"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
            alunosTableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        alunosTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Erro ao recarregar a lista.</td></tr>";
    }
}

// Função para preencher o formulário com os dados do aluno para edição
function editarAluno(id, nome, email, cpf, rg, orgaoRg, endereco, telefone, telefoneAlt, cursoSolicitado, idade, dataInicio, formaPagamento, turnoParam) {
    document.getElementById("alunoId").value = id;
    document.getElementById("nome").value = nome;
    document.getElementById("email").value = email;
    document.getElementById("cpf").value = cpf;
    document.getElementById("rg").value = rg;
    document.getElementById("orgaoRg").value = orgaoRg;
    document.getElementById("endereco").value = endereco;
    document.getElementById("telefone").value = telefone;
    document.getElementById("telefoneAlt").value = telefoneAlt || '';
    document.getElementById("formaPagamento").value = formaPagamento || '';
    document.getElementById("cursoSolicitado").value = cursoSolicitado || '';
    document.getElementById("dataInicio").value = dataInicio || '';
    document.getElementById("turno").value = turnoParam || '';
    document.getElementById("idade").value = idade || '';

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
function criarContrato(nome, idade, cpf, rg, orgaoRg, endereco, telefone, telefoneAlt, formaPagamento, cursoSolicitado, dataInicio, turno) {
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
Pelo presente instrumento particular o Sr(a) NNN, IIII anos, CPF Nº CCC, RG nº RRR - SSS, residente na EEE , TELEFONE: TTT1, GGG2, Doravante Denominado CONTRATANTE e a THÉMIS – ACADEMIA DE FORMAÇÃO DE VIGILANTES LTDA-EPP, nome fantasia THÉMIS – ACADEMIA DE FORMAÇÃO DEVIGILANTES, inscrita no CNPJ 26.489.471/0001-07, autorizada  a    funcionar pelo   DEPARTAMENTO de POLICIA FEDERAL, conforme alvará Nº 4.733/17 , estabelecida na Avenida JK Qd. 12 Lote 16 Sala 2B – Jardim Brasília –Águas Lindas – GO, doravante denominada CONTRATADA, resolvem celebrar o presente contrato de prestação de serviços, conforme cláusulas a seguir:
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
            .replace(/RRR/g, rg)
            .replace(/SSS/g, orgaoRg)
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

// Funcionalidade do modal
function fecharModalAluno() {
    const modalAluno = document.getElementById('modalAluno');
    if (modalAluno) modalAluno.classList.remove('active');
}

// Abrir modal aluno limpo
function abrirModalAluno() {
    document.getElementById("alunoForm").reset();
    document.getElementById("alunoId").value = "";
    document.getElementById('modalAlunoTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar Aluno';
    document.getElementById('modalAluno').classList.add('active');
}

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/login/login.html';
    });
}

// Funcionalidade de Abas (Tabs)
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    
    // Ativa o botao
    if(tabName === 'tabAlunos') {
        document.querySelector('.tab-btn[onclick="openTab(\'tabAlunos\')"]').classList.add('active');
        carregarAlunos();
    } else {
        document.querySelector('.tab-btn[onclick="openTab(\'tabCursos\')"]').classList.add('active');
        carregarCursos();
    }
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
            const row = `
                <tr>
                    <td><strong>${curso.nome}</strong></td>
                    <td>R$ ${curso.preco || '0,00'}</td>
                    <td>${curso.cargaHr || '--'}</td>
                    <td>${curso.dataTurma || '--'}</td>
                    <td style="text-align: center;">
                        <button class="action-btn edit-btn" onclick="editarCurso('${doc.id}', '${curso.nome}', '${curso.preco}', '${curso.cargaHr}', '${curso.dataTurma}')" title="Editar Curso">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </td>
                </tr>
            `;
            cursosTableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Erro ao carregar cursos:", error);
    }
}

// Preenche dados padrão se a coleção de cursos estiver vazia
async function initCursos() {
    const cursosPadrao = [
        { nome: 'Formação Básica de Vigilante', preco: '1.200,00', cargaHr: '200 Horas', dataTurma: 'Em Breve' },
        { nome: 'Extensão em Escolta Armada', preco: '550,00', cargaHr: '50 Horas', dataTurma: 'A Definir' },
        { nome: 'Extensão em Transporte de Valores', preco: '550,00', cargaHr: '50 Horas', dataTurma: 'A Definir' },
        { nome: 'Segurança Pessoal Privada (VSPP)', preco: '650,00', cargaHr: '50 Horas', dataTurma: 'A Definir' },
        { nome: 'Supervisor de Segurança', preco: '800,00', cargaHr: '40 Horas', dataTurma: 'A Definir' }
    ];
    for (const curso of cursosPadrao) {
        await db.collection("cursos").add(curso);
    }
    carregarCursos();
}

function editarCurso(id, nome, preco, cargaHr, dataTurma) {
    document.getElementById("cursoId").value = id;
    document.getElementById("cursoNome").value = nome;
    document.getElementById("cursoPreco").value = preco !== 'undefined' ? preco : '';
    document.getElementById("cursoCargaHr").value = cargaHr !== 'undefined' ? cargaHr : '';
    document.getElementById("cursoDataTurma").value = dataTurma !== 'undefined' ? dataTurma : '';

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
        const cargaHr = document.getElementById("cursoCargaHr").value;
        const dataTurma = document.getElementById("cursoDataTurma").value;

        try {
            await db.collection("cursos").doc(id).update({
                preco,
                cargaHr,
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
