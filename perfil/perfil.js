const firebaseConfig = {
      apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
      authDomain: "themis-154d1.firebaseapp.com",
      projectId: "themis-154d1",
      storageBucket: "themis-154d1.firebasestorage.app",
      messagingSenderId: "1017306886601",
      appId: "1:1017306886601:web:3b7f5057515d244c2bb818",
      measurementId: "G-3G0VW26WD9"
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "/login/login.html";
    return;
  }


firebase.auth().onAuthStateChanged(user => {
    if(user) {
      findperfil(user);
    }
});
});

function gohome() {
  window.location.href = "/home/home.html";
}

function findperfil(user){
firebase.firestore()
    .collection('usuarios')
    .where('user.uid', '==', user.uid)
    .orderBy('nome', 'asc')
    .get()
    .then(snapshot => {
    if (!snapshot.empty) {
        const dados = snapshot.docs[0].data();
        document.getElementById('nome').textContent = dados.nome;
        document.getElementById('cpf').textContent = dados.cpf;
        document.getElementById('rg').textContent = dados.rg;
        document.getElementById('telefone').textContent = dados.telefone;
        document.getElementById('nascimento').textContent = dados.nascimento;
        document.getElementById('estadoCivil').textContent = dados.estadoCivil;
        document.getElementById('endereco').textContent = dados.endereco;
        document.getElementById('atribuicao').textContent = dados.atribuicao;
    } else {
        alert("Dados do usuário não encontrados.");
    }
    })
    .catch(error => {
    console.error("Erro ao buscar dados:", error);
    });
}
// Logout
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "/login/login.html";
  });
}

    /*
buscar dasdos do usuario
function findCadater(){
firebase.firestore()
  .collection('usuarios')
  .get()
  .then(snapshot => {
    snapshot.docs.forEach(doc => {
      console.log(doc.data());
    });
    const dadosuser =  snapshot.docs.map(doc => doc.data());
  })

}*/