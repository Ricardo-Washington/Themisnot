// Inicialize o Firebase
    firebase.initializeApp(firebaseConfig);
// Adiciona o listener para o formulário
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    register(); // Chama a função de registro
});

function register() {
    const email = document.getElementById('email').value.trim();
    const confirmEmail = document.getElementById('confirmEmail').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (email !== confirmEmail) {
        alert('Os e-mails não coincidem.');
        return;
    }
    if (password !== confirmPassword) {
        alert('As senhas não coincidem.');
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(() => {
            alert('Registro realizado com sucesso!');
            window.location.href = '/home/home.html'; // Redireciona para a página inicial
        })
        .catch(error => {
            console.error('Erro ao registrar:', error);
            alert(getErrorMessage(error));
        });
}

function getErrorMessage(error) {
    if (error.code === 'auth/email-already-in-use') {
        return 'Este e-mail já está em uso.';
    } else if (error.code === 'auth/invalid-email') {
        return 'O e-mail fornecido é inválido.';
    } else if (error.code === 'auth/weak-password') {
        return 'A senha deve ter pelo menos 6 caracteres.';
    } else {
        return error.message;
    }
}