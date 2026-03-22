const firebaseConfig = {
  apiKey: "AIzaSyAxwS4HeioFdcD6MaDDoVYmJUthcJhTfjc",
  authDomain: "themis-154d1.firebaseapp.com",
  projectId: "themis-154d1",
  storageBucket: "themis-154d1.firebasestorage.app",
  messagingSenderId: "1017306886601",
  appId: "1:1017306886601:web:3b7f5057515d244c2bb818",
  measurementId: "G-3G0VW26WD9"
};
    // Inicializa o Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    // Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const atribuicao = userDoc.data().atribuicao;
        if (atribuicao !== "adm") {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = "/home/home.html";
        } else {
            findUsers();
        }
    }
});

let usuariosFuncionarios = [];
let usuariosAlunos = [];
let usuarioAtual = null;
let tipoAtual = null; 

// A função principal para buscar e separar os dados
function findUsers() {
  firebase.firestore()
    .collection('usuarios')
    .orderBy('dataCadastro', 'desc')
    .get()
    .then(snapshot => {
      const todosUsuarios = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

      usuariosFuncionarios = todosUsuarios.filter(user => user.atribuicao === 'funcionario');
      usuariosAlunos = todosUsuarios.filter(user => user.atribuicao === 'aluno' || user.atribuicao === 'Aluno');

      renderizarLista('dadosfuincionario', usuariosFuncionarios);
      renderizarLista('dadosaluno', usuariosAlunos);
    })
    .catch(error => {
      console.error("Erro ao buscar usuários: ", error);
    });
}

// A função reutilizável para renderizar a lista
function renderizarLista(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

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

// Modal
function openModal(tipo) {
  tipoAtual = tipo;
  const modal = document.getElementById('editModal');
  const select = document.getElementById('selectUsuario');
  const nomeInput = document.getElementById('editNome');
  const cpfInput = document.getElementById('editCpf');
  const enderecoInput = document.getElementById('editEndereco');
  const telefoneInput = document.getElementById('editTelefone');
  const rgInput = document.getElementById('editRg');
  const nascimentoInput = document.getElementById('editNascimento');
  const atribuicaoSelect = document.getElementById('editAtribuicao');
  const deleteBtn = document.getElementById('deleteButton');
  const modalTitle = document.getElementById('modalTitle');

  select.innerHTML = '';
  let lista = tipo === 'funcionario' ? usuariosFuncionarios : usuariosAlunos;
  modalTitle.textContent = tipo === 'funcionario' ? 'Editar Funcionário' : 'Editar Aluno';

  lista.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.nome + ' (' + user.cpf + ')';
    select.appendChild(option);
  });

  if (lista.length > 0) {
    usuarioAtual = lista[0];
    nomeInput.value = usuarioAtual.nome || '';
    cpfInput.value = usuarioAtual.cpf || '';
    enderecoInput.value = usuarioAtual.endereco || '';
    telefoneInput.value = usuarioAtual.telefone || '';
    rgInput.value = usuarioAtual.rg || '';
    nascimentoInput.value = usuarioAtual.nascimento || '';
    atribuicaoSelect.value = usuarioAtual.atribuicao || '';
    deleteBtn.style.display = 'inline-block';
  } else {
    usuarioAtual = null;
    nomeInput.value = '';
    cpfInput.value = '';
    enderecoInput.value = '';
    telefoneInput.value = '';
    rgInput.value = '';
    nascimentoInput.value = '';
    atribuicaoSelect.value = '';
    deleteBtn.style.display = 'none';
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Atualiza campos ao trocar usuário selecionado
document.getElementById('selectUsuario').addEventListener('change', function() {
  let lista = tipoAtual === 'funcionario' ? usuariosFuncionarios : usuariosAlunos;
  usuarioAtual = lista.find(u => u.id === this.value);
  document.getElementById('editNome').value = usuarioAtual?.nome || '';
  document.getElementById('editCpf').value = usuarioAtual?.cpf || '';
  document.getElementById('editEndereco').value = usuarioAtual?.endereco || '';
  document.getElementById('editTelefone').value = usuarioAtual?.telefone || '';
  document.getElementById('editRg').value = usuarioAtual?.rg || '';
  document.getElementById('editNascimento').value = usuarioAtual?.nascimento || '';
  document.getElementById('editAtribuicao').value = usuarioAtual?.atribuicao || '';
});

// Editar usuário
document.getElementById('editForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!usuarioAtual) return;

  const novoNome = document.getElementById('editNome').value;
  const novoCpf = document.getElementById('editCpf').value;
  const novoEndereco = document.getElementById('editEndereco').value;
  const novoTelefone = document.getElementById('editTelefone').value;
  const novoRg = document.getElementById('editRg').value;
  const novoNascimento = document.getElementById('editNascimento').value;
  const novaAtribuicao = document.getElementById('editAtribuicao').value;

  firebase.firestore()
    .collection('usuarios')
    .doc(usuarioAtual.id)
    .update({
      nome: novoNome,
      cpf: novoCpf,
      endereco: novoEndereco,
      telefone: novoTelefone,
      rg: novoRg,
      nascimento: novoNascimento,
      atribuicao: novaAtribuicao
    })
    .then(() => {
      alert("Usuário atualizado!");
      closeModal();
      findUsers();
    })
    .catch(error => {
      alert("Erro ao atualizar: " + error.message);
    });
});

// Excluir usuário
document.getElementById('deleteButton').addEventListener('click', function() {
  if (!usuarioAtual) return;
  if (confirm(`Excluir ${usuarioAtual.nome}?`)) {
    firebase.firestore()
      .collection('usuarios')
      .doc(usuarioAtual.id)
      .delete()
      .then(() => {
        alert("Usuário excluído!");
        closeModal();
        findUsers();
      })
      .catch(error => {
        alert("Erro ao excluir: " + error.message);
      });
  }
});
