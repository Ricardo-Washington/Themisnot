
    // Verifique se o usuário está autenticado
    function isAuthenticated() {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // Se o usuário não estiver logado, redirecione para a página de login
                window.location.href = "/login/login.html";
            }
        });
    }