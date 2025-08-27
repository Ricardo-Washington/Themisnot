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