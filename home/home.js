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
    endereco: () => document.getElementById('endereco'),
    atribuição: () => document.getElementById('atribuição'),
}

// Verifica o estado de autenticação e dados do usuário
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        // Verifica se o documento do usuário já existe no Firestore
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Se o documento não existe, é o primeiro login. Abre o modal.
            openModal();
        }
    }
});

// Função para abrir o modal
function openModal() {
    document.getElementById('userModal').style.display = 'flex';
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
    
    const userData = {
        nome: form.nome().value,
        cpf: form.cpf().value,
        rg: form.rg().value,
        telefone: form.telefone().value,
        nascimento: form.nascimento().value,
        estadoCivil: form.estadoCivil().value,
        endereco: form.endereco().value,
        atribuição: form.atribuição().value,
         user:{
            uid: firebase.auth().currentUser.uid,
        }
    };
    
    if (!userData.nome || !userData.cpf || !userData.rg) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    try {
        await db.collection('usuarios').doc(user.uid).set(userData);
        console.log("Dados do usuário salvos com sucesso!");
        alert('Cadastro realizado com sucesso! Seja bem-vindo.');
        closeModal();
    } catch (error) {
        console.error("Erro ao salvar os dados do usuário:", error);
        alert("Erro ao cadastrar. Tente novamente.");
    }
}

// Adicione o listener de evento para a função cadastrarDados() no formulário
document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userRegisterForm');
    if (userForm) {
        userForm.addEventListener('submit', cadastrarDados);
    }
});

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
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
