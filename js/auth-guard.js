
    // Verifique se o usuário está autenticado
    function isAuthenticated() {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // Se o usuário não estiver logado, redirecione para a página de login
                window.location.href = "/login/login.html";
            }
        });
    }

    function redirecionarPorAtribuicao(atribuicao) {
        const perfil = String(atribuicao || '').toLowerCase();
        const destinos = {
            professor: '/professor/professor.html',
            funcionario: '/rgFuncionario/rgrgfuncionario.html',
            admin: '/rgFuncionario/rgrgfuncionario.html',
            adm: '/adm/adm.html'
        };

        alert('A área do aluno é exclusiva para usuários com atribuição Aluno.');
        window.location.replace(destinos[perfil] || '/index/index.html');
    }