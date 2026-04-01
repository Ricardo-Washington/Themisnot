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
} else {
    firebase.app(); // Use a instância já inicializada
}

const db = firebase.firestore();

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    login(); // Chama a função de login
});

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Verifica a atribuição do usuário no Firestore para redirecionar corretamente
        try {
            const userDoc = await db.collection("usuarios").doc(user.uid).get();
            const dados = userDoc.data();
           // Injeta a saudacao do usuario na navbar
           if (dados && (dados.nome || dados.nomeCompleto)) {
               const nomeExibicao = dados.nome || dados.nomeCompleto;
               const pNome = nomeExibicao.split(' ')[0];
               document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
           }

            
            if (dados && (dados.atribuicao === "funcionario" || dados.atribuicao === "admin")) {
                window.location.href = "/rgFuncionario/rgrgfuncionario.html";
            } else if (dados && dados.atribuicao === "adm") {
                window.location.href = "/adm/adm.html";
            } else {
                window.location.href = "/home/home.html";
            }
        } catch (error) {
            console.error("Erro ao puxar dados do usuário:", error);
            window.location.href = "/home/home.html";
        }
    } else {
        // Usuário não está logado
        console.log('Nenhum usuário logado');
    }
});

// Função para realizar o login
function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('registerMessage');
    
    // Regex para validar o formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        messageDiv.textContent = 'Por favor, insira um e-mail válido.';
        messageDiv.style.color = 'red';
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login bem-sucedido
            console.log('Login bem-sucedido:', userCredential);
            messageDiv.textContent = 'Carregando seu painel...';
            messageDiv.style.color = 'green';
            // O redirecionamento será tratado pelo onAuthStateChanged acima!
        })
        .catch((error) => {
            // Tratar erros de login
            console.error('Erro ao fazer login:', error);
            if (error.code === 'auth/invalid-email') {
                messageDiv.textContent = 'O endereço de e-mail está mal formatado.';
            } else if (error.code === 'auth/user-not-found') {
                messageDiv.textContent = 'Usuário não encontrado. Verifique o e-mail.';
            } else if (error.code === 'auth/wrong-password') {
                messageDiv.textContent = 'Senha incorreta. Tente novamente.';
            } else if (error.code === 'auth/invalid-credential') {
                messageDiv.textContent = 'Senha incorreta. Tente novamente.';
            } else {
                messageDiv.textContent = 'Erro ao fazer login: ' + error.message;
            }
            messageDiv.style.color = 'red';
        });

}

function recoverPassword() {
    showLoading();
    firebase.auth().sendPasswordResetEmail(form.email().value).then(() => {
        hideLoading();
        alert('Email enviado com sucesso');
    }).catch(error => {
        hideLoading();
        alert(getErrorMessage(error));
    });
}

function registerFunc() {
    window.location.href = "/registerEmployee/employee.html"; // Redireciona para a página de registro de funcionário
}