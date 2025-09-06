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
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        // Busca dados do usuário
        const docRef = firebase.firestore().collection('usuarios').doc(user.uid);
        const doc = await docRef.get();
        document.getElementById('userModal').style.display = 'flex';
        if (doc.exists) {
            const dados = doc.data();
            document.getElementById('nome').value = dados.nome || '';
            document.getElementById('nascimento').value = dados.nascimento || '';
            document.getElementById('cpf').value = dados.cpf || '';
            document.getElementById('rg').value = dados.rg || '';
            document.getElementById('telefone').value = dados.telefone || '';
            document.getElementById('estadoCivil').value = dados.estadoCivil || '';
            document.getElementById('endereco').value = dados.endereco || '';
        }
    }
});



function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    });
}

