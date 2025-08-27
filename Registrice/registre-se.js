 // Configuração do Firebase
        const firebaseConfig = {
            apiKey: "SUA_API_KEY",
            authDomain: "SEU_AUTH_DOMAIN",
            projectId: "SEU_PROJECT_ID",
            // ...outros dados do seu projeto Firebase
        };
        firebase.initializeApp(firebaseConfig);

        const registerForm = document.getElementById('registerForm');
        const registerMessage = document.getElementById('registerMessage');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerMessage.textContent = '';
            const email = document.getElementById('email').value.trim();
            const confirmEmail = document.getElementById('confirmEmail').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (email !== confirmEmail) {
                registerMessage.textContent = 'Os e-mails não coincidem.';
                registerMessage.style.color = 'red';
                return;
            }
            if (password !== confirmPassword) {
                registerMessage.textContent = 'As senhas não coincidem.';
                registerMessage.style.color = 'red';
                return;
            }
            if (password.length < 6) {
                registerMessage.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                registerMessage.style.color = 'red';
                return;
            }

            try {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
                registerMessage.textContent = 'Registro realizado com sucesso!';
                registerMessage.style.color = 'green';
                registerForm.reset();
            } catch (error) {
                registerMessage.textContent = error.message;
                registerMessage.style.color = 'red';
            }
        });