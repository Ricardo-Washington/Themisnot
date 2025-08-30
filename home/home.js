const firebaseConfig = {
    apiKey: "AIzaSyDVK6hzW1gifPrjDQrC00I9GWQqumaY3PE",
    authDomain: "themis-bcaa4.firebaseapp.com",
    projectId: "themis-bcaa4",
    storageBucket: "themis-bcaa4.appspot.com",
    messagingSenderId: "244101876997",
    appId: "1:244101876997:web:fcee5a85d3506417c7fb6c"
};
// Inicialize o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Use a instância já inicializada
}

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    login(); // Chama a função de login
});

firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Se o usuário não estiver logado, redirecione para a página de login
            window.location.href = "/login/login.html";
        }
    });

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    });
}
