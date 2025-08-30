// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDVK6hzW1gifPrjDQrC00I9GWQqumaY3PE",
    authDomain: "themis-bcaa4.firebaseapp.com",
    projectId: "themis-bcaa4",
    storageBucket: "themis-bcaa4.appspot.com",
    messagingSenderId: "244101876997",
    appId: "1:244101876997:web:fcee5a85d3506417c7fb6c"
};
// Inicialize o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Use a instância já inicializada
}

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    login(); // Chama a função de login
});

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Usuário está logado
        console.log('Usuário logado:', user);
        window.location.href = "/home/home.html"; // Redireciona para a página home
    } else {
        // Usuário não está logado
        console.log('Nenhum usuário logado');
    }
});

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
            window.location.href = "/home/home.html"; // Redireciona para a página home
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
            }else {
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