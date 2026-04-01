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
let alunoDataGlobals = null; // Armazena os dados do aluno para o PDF

// Verifica o estado de autenticação
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        // Carrega as informações básicas para o menu (ex: Ola Nome)
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (userDoc.exists) {
            const dadosUsuario = userDoc.data();
            const pNome = (dadosUsuario.nome || user.email).split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => {
                el.innerHTML = `Olá, ${pNome} <i class="fa fa-user-circle"></i>`;
            });
        }
        
        // Busca a ficha oficial em `usuarios` usando o uid
        buscarFichaDoAluno(user.uid);
    }
});

async function buscarFichaDoAluno(uid) {
    try {
        const docRef = await db.collection("usuarios").doc(uid).get();
        
        document.getElementById('loading').style.display = 'none';

        if (docRef.exists) {
            alunoDataGlobals = docRef.data();

            // Preenche os campos na tela
            document.getElementById('nome-aluno').textContent = alunoDataGlobals.nome || '-';
            document.getElementById('email-aluno').textContent = alunoDataGlobals.email || '-';
            document.getElementById('cpf-aluno').textContent = alunoDataGlobals.cpf || '-';
            document.getElementById('rg-aluno').textContent = alunoDataGlobals.rg || '-';
            document.getElementById('endereco-aluno').textContent = alunoDataGlobals.endereco || '-';
            document.getElementById('telefone-aluno').textContent = alunoDataGlobals.telefone || '-';

            // Mostra o card
            document.getElementById('profile-content').style.display = 'block';
        } else {
            // Mostra mensagem de erro
            document.getElementById('error-message').style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao buscar a ficha:", error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-message').innerHTML = `<h3>Erro ao conectar</h3><p>${error.message}</p>`;
        document.getElementById('error-message').style.display = 'block';
    }
}

// Lógica de Geração de Contrato Pela Biblioteca jsPDF
document.getElementById('btn-gerar-contrato').addEventListener('click', () => {
    if (!alunoDataGlobals) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Extraindo variaveis do objeto global resgatado do banco
        const nome = alunoDataGlobals.nome || "";
        const idade = alunoDataGlobals.idade || "";
        const cpf = alunoDataGlobals.cpf || "";
        const rg = alunoDataGlobals.rg || "";
        const orgaoRg = alunoDataGlobals.orgaoRg || "";
        const endereco = alunoDataGlobals.endereco || "";
        const telefone = alunoDataGlobals.telefone || "";
        const telefoneAlt = alunoDataGlobals.telefoneAlt || "";
        const formaPagamento = alunoDataGlobals.formaPagamento || "";
        const cursoSolicitado = alunoDataGlobals.cursoSolicitado || "";
        const dataInicio = alunoDataGlobals.dataInicio || "";
        const turno = alunoDataGlobals.turno || "";

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
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.line(15, y, 90, y); // Linha para assinatura contratada
            doc.line(120, y, 195, y); // Linha para assinatura contratante
            doc.text("CONTRATADA", 35, y + 6);
            doc.text("CONTRATANTE", 145, y + 6);

            doc.save(`Contrato_${nome || 'Aluno'}.pdf`);
        };
        
    } catch (e) {
        console.error("Erro na geração do PDF:", e);
        alert("Falha ao gerar o PDF. A biblioteca jsPDF pode não ter carregado corretamente.");
    }
});

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/login/login.html';
    });
}
