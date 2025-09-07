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

  firebase.initializeApp(firebaseConfig);
  // Inicialize o Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // Use a instância já inicializada
  }

  // Inicialize o Firestore
  const db = firebase.firestore();

  // Adiciona o listener para o formulário
  document.getElementById('registerForm').addEventListener('submit', function(event) {
  event.preventDefault(); // Impede o envio padrão do formulário
  // Chama a função de registro
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

  function registerUser() {
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

    // Cria o usuário no Firebase Authentication
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        // Salva os dados do usuário no Firestore
        const logado =  db.collection('users').doc(user.uid).set({
          email: user.email,
          createdAt: new Date()
        });
      })
      .then(() => {
        alert('Registro realizado com sucesso!');
        window.location.href = '/login/login.html'; // Redireciona para a página de login
      })
      .catch(error => {
        console.error('Erro ao registrar:', error);
        alert(getErrorMessage(error));
      });
  }
  // Função para mapear códigos de erro para mensagens amigáveis
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
