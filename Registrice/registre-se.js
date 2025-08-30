// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDVK6hzW1gifPrjDQrC00I9GWQqumaY3PE",
  authDomain: "themis-bcaa4.firebaseapp.com",
  projectId: "themis-bcaa4",
  storageBucket: "themis-bcaa4.firebasestorage.app",
  messagingSenderId: "244101876997",
  appId: "1:244101876997:web:fcee5a85d3506417c7fb6c"
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
  registerUser(); // Chama a função de registro
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
      return db.collection('users').doc(user.uid).set({
        email: user.email,
        createdAt: new Date()
      });
      window.location.href = '/home/home.html';
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