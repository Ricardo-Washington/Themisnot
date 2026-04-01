// Configuração Global do Firebase para o Projeto Themis
const firebaseConfig = {
    apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
    authDomain: "themis-154d1.firebaseapp.com",
    projectId: "themis-154d1",
    storageBucket: "themis-154d1.firebasestorage.app",
    messagingSenderId: "1017306886601",
    appId: "1:1017306886601:web:3b7f5057515d244c2bb818",
    measurementId: "G-3G0VW26WD9"
};

// Inicializa o Firebase (compat syntax)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Expõe a referência do Firestore para as demais páginas
const db = firebase.firestore();
