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

findCadater();
/*buscar dasdos do usuario*/
function findCadater(){
firebase.firestore()
  .collection('usuarios')
  .get()
  .then(snapshot => {
    console.log(snapshot.docs.map(doc => doc.data()));

    console.log(snapshot.docs.collections);

    const dadosuser =  snapshot.docs.map(doc => doc.data());
    addInfor(dadosuser);
  })
}

function addInfor(dadosuser){
  const lista = document.getElementById('dadosuser');

  dadosuser.forEach(dadosuse => { 

    const li = document.createElement('li');
    li.classList.add(dadosuse.atribuicao);
    
    const nome = document.createElement('p');
    nome.innerHTML = dadosuse.nome;
    li.appendChild(nome);

    const cpf = document.createElement('p');
    cpf.innerHTML = dadosuse.cpf;
    li.appendChild(cpf);

    const atribuicao = document.createElement('p');
    atribuicao.innerHTML = dadosuse.atribuicao;
    li.appendChild(atribuicao);



    lista.appendChild(li);

    
  });
}
