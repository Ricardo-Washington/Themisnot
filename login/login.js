document.getElementById('registerForm').addEventListener('submit', function(event) {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const messageDiv = document.getElementById('registerMessage');
    // Regex simples para validação de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        event.preventDefault();
        messageDiv.textContent = 'Por favor, insira um e-mail válido.';
        messageDiv.style.color = 'red';
        emailInput.focus();
        return false;
    } else {
        messageDiv.textContent = '';
    }
});

function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('registerMessage');

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login bem-sucedido
            console.log('Login bem-sucedido:', userCredential);
            window.location.href = "../home/home.html";
        })
        .catch((error) => {
            // Tratar erros de login
            console.error('Erro ao fazer login:', error);
            messageDiv.textContent = 'Erro ao fazer login: ' + error.message;
            messageDiv.style.color = 'red';
        });
}

console.log(firebase.apps.length ? 'Firebase inicializado' : 'Firebase não inicializado');