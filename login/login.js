document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    login(); // Chama a função de login
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
            } else {
                messageDiv.textContent = 'Erro ao fazer login: ' + error.message;
            }
            messageDiv.style.color = 'red';
        });
}

