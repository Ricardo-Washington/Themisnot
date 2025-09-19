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
        const atribuicao = userDoc.data().atribuicao;
        if (atribuicao !== "funcionario" && atribuicao !== "adm") {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = "/home/home.html";
        }
    }
});

// Função para cadastrar ou editar aluno
document.getElementById("alunoForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const alunoId = document.getElementById("alunoId").value;
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefone = document.getElementById("telefone").value;

    const alunoData = { nome, email, telefone };

    try {
        if (alunoId) {
            // Atualiza aluno existente
            await db.collection("alunos").doc(alunoId).update(alunoData);
            alert("Aluno atualizado com sucesso!");
        } else {
            // Cadastra novo aluno
            await db.collection("alunos").add(alunoData);
            alert("Aluno cadastrado com sucesso!");
        }
        document.getElementById("alunoForm").reset();
        carregarAlunos();
    } catch (error) {
        console.error("Erro ao salvar aluno:", error);
        alert("Erro ao salvar aluno. Tente novamente.");
    }
});

// Função para carregar alunos na tabela
async function carregarAlunos() {
    const alunosTableBody = document.getElementById("alunosTableBody");
    alunosTableBody.innerHTML = "";

    const snapshot = await db.collection("alunos").get();
    snapshot.forEach((doc) => {
        const aluno = doc.data();
        const row = `
            <tr>
                <td>${aluno.nome}</td>
                <td>${aluno.email}</td>
                <td>${aluno.telefone}</td>
                <td>
                    <button onclick="editarAluno('${doc.id}', '${aluno.nome}', '${aluno.email}', '${aluno.telefone}')">Editar</button>
                    <button onclick="excluirAluno('${doc.id}')">Excluir</button>
                </td>
            </tr>
        `;
        alunosTableBody.innerHTML += row;
    });
}

// Função para preencher o formulário com os dados do aluno para edição
function editarAluno(id, nome, email, telefone) {
    document.getElementById("alunoId").value = id;
    document.getElementById("nome").value = nome;
    document.getElementById("email").value = email;
    document.getElementById("telefone").value = telefone;
}

// Função para excluir aluno
async function excluirAluno(id) {
    if (confirm("Tem certeza que deseja excluir este aluno?")) {
        try {
            await db.collection("alunos").doc(id).delete();
            alert("Aluno excluído com sucesso!");
            carregarAlunos();
        } catch (error) {
            console.error("Erro ao excluir aluno:", error);
            alert("Erro ao excluir aluno. Tente novamente.");
        }
    }
}

// Redireciona para a aba de cursos
document.getElementById("btnCursos").addEventListener("click", () => {
    window.location.href = "/cursos/cadastrarCursos.html";
});

// Carrega os alunos ao carregar a página
document.addEventListener("DOMContentLoaded", carregarAlunos);