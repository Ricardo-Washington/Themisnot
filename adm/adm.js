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


// A função principal para buscar e separar os dados
function findUsers() {
  firebase.firestore()
    .collection('usuarios')
    .get()
    .then(snapshot => {
      const todosUsuarios = snapshot.docs.map(doc => doc.data());

      // Filtra os usuários em dois arrays distintos
      const funcionarios = todosUsuarios.filter(user => user.atribuicao === 'funcionario');
      const alunos = todosUsuarios.filter(user => user.atribuicao === 'aluno');

      // Renderiza cada lista no seu local específico
      renderizarLista('dadosfuincionario', funcionarios);
      renderizarLista('dadosaluno', alunos);
    })
    .catch(error => {
      console.error("Erro ao buscar usuários: ", error);
    });
}

// A função reutilizável para renderizar a lista
function renderizarLista(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = ''; // Limpa a lista antes de adicionar os itens

  dados.forEach(usuario => {
    const li = document.createElement('li');
    li.classList.add('item');

    const nome = document.createElement('p');
    nome.innerHTML = `<strong>Nome:</strong> ${usuario.nome}`;
    li.appendChild(nome);

    const cpf = document.createElement('p');
    cpf.innerHTML = `<strong>CPF:</strong> ${usuario.cpf}`;
    li.appendChild(cpf);

    const atribuicao = document.createElement('p');
    atribuicao.innerHTML = `<strong>Atribuição:</strong> ${usuario.atribuicao}`;
    li.appendChild(atribuicao);

    lista.appendChild(li);
  });
}

// Chama a função principal para iniciar o processo
findUsers();
