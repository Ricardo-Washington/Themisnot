    firebaseConfig.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "/login/login.html"; // Redireciona para a página de login
        }
    });