// A inicialização do Firebase e o objeto `db` vêm agora do arquivo compartilhado global: /js/firebase-config-shared.js
    
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
        const dados = userDoc.data();
        const atribuicao = dados ? dados.atribuicao : null;

        // Injeta a saldacao do usuario na navbar
        if (dados && (dados.nome || dados.nomeCompleto)) {
            const nomeExibicao = dados.nome || dados.nomeCompleto;
            const pNome = nomeExibicao.split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
        }

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
let cursosList = [];
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
  
  fetchCursos();
}

function fetchCursos() {
  firebase.firestore()
    .collection('cursos')
    .get()
    .then(snapshot => {
      cursosList = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
      if (cursosList.length === 0) {
        initCursos();
      } else {
        renderizarCursos('dadoscursos', cursosList);
      }
    })
    .catch(error => {
      console.error("Erro ao buscar cursos: ", error);
    });
}

function initCursos() {
    const cursosPadrao = [
        { id: "armasNaoLetais", nome: "Armamento Não Letal", preco: "500,00", cargaHoraria: "80 horas", proximaTurma: "A definir" },
        { id: "Reciclagem", nome: "Reciclagem de Vigilante", preco: "300,00", cargaHoraria: "40 horas", proximaTurma: "A definir" },
        { id: "escoltaArm", nome: "Escolta Armada", preco: "600,00", cargaHoraria: "50 horas", proximaTurma: "A definir" },
        { id: "grandesEventos", nome: "Grandes Eventos", preco: "450,00", cargaHoraria: "60 horas", proximaTurma: "A definir" },
        { id: "vigilante", nome: "Vigilante", preco: "800,00", cargaHoraria: "200 horas", proximaTurma: "A definir" }
    ];

    const batch = firebase.firestore().batch();
    cursosPadrao.forEach(curso => {
        const docRef = firebase.firestore().collection('cursos').doc(curso.id);
        batch.set(docRef, curso);
    });

    batch.commit().then(() => {
        fetchCursos();
    }).catch(error => console.error(error));
}

// A função reutilizável para renderizar a lista (Com proteção XSS)
function renderizarLista(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  dados.forEach(usuario => {
    const li = document.createElement('li');
    li.classList.add('item');

    const nome = document.createElement('p');
    const nomeStrong = document.createElement('strong');
    nomeStrong.textContent = 'Nome: ';
    nome.appendChild(nomeStrong);
    nome.appendChild(document.createTextNode(usuario.nome));
    li.appendChild(nome);

    const cpf = document.createElement('p');
    const cpfStrong = document.createElement('strong');
    cpfStrong.textContent = 'CPF: ';
    cpf.appendChild(cpfStrong);
    cpf.appendChild(document.createTextNode(usuario.cpf));
    li.appendChild(cpf);

    const atribuicao = document.createElement('p');
    const atribStrong = document.createElement('strong');
    atribStrong.textContent = 'Atribuição: ';
    atribuicao.appendChild(atribStrong);
    atribuicao.appendChild(document.createTextNode(usuario.atribuicao));
    li.appendChild(atribuicao);

    lista.appendChild(li);
  });
}

function renderizarCursos(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  dados.forEach(curso => {
    const li = document.createElement('li');
    li.classList.add('item');

    const nome = document.createElement('p');
    nome.innerHTML = `<strong>Curso:</strong> ${curso.nome}`;
    li.appendChild(nome);

    const detalhes = document.createElement('p');
    detalhes.textContent = `Preço: R$ ${curso.preco} | C. Horária: ${curso.cargaHoraria}`;
    li.appendChild(detalhes);

    const turma = document.createElement('p');
    turma.textContent = `Próxima Turma: ${curso.proximaTurma}`;
    li.appendChild(turma);

    lista.appendChild(li);
  });
}

// Modal
function openModal(tipo) {
  tipoAtual = tipo;
  const modal = document.getElementById('editModal');
  const select = document.getElementById('selectUsuario');
  
  // Campos
  const camposUsuario = document.getElementById('camposUsuario');
  const camposCurso = document.getElementById('camposCurso');
  
  const nomeInput = document.getElementById('editNome');
  const cpfInput = document.getElementById('editCpf');
  const enderecoInput = document.getElementById('editEndereco');
  const telefoneInput = document.getElementById('editTelefone');
  const rgInput = document.getElementById('editRg');
  const nascimentoInput = document.getElementById('editNascimento');
  const atribuicaoSelect = document.getElementById('editAtribuicao');
  
  const nomeCursoInput = document.getElementById('editNomeCurso');
  const precoInput = document.getElementById('editPreco');
  const cargaHrInput = document.getElementById('editCargaHr');
  const dataTurmaInput = document.getElementById('editDataTurma');
  
  const deleteBtn = document.getElementById('deleteButton');
  const modalTitle = document.getElementById('modalTitle');

  select.innerHTML = '';

  if (tipo === 'curso') {
    camposUsuario.style.display = 'none';
    camposCurso.style.display = 'flex';
    camposCurso.style.flexDirection = 'column';
    camposCurso.style.gap = '18px';
    modalTitle.textContent = 'Editar Curso';
    
    cursosList.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.nome;
      select.appendChild(option);
    });

    if (cursosList.length > 0) {
      usuarioAtual = cursosList[0];
      nomeCursoInput.value = usuarioAtual.nome || '';
      precoInput.value = usuarioAtual.preco || '';
      cargaHrInput.value = usuarioAtual.cargaHoraria || '';
      dataTurmaInput.value = usuarioAtual.proximaTurma || '';
      deleteBtn.style.display = 'none';
    }
  } else {
    camposUsuario.style.display = 'flex';
    camposUsuario.style.flexDirection = 'column';
    camposUsuario.style.gap = '18px';
    camposCurso.style.display = 'none';
    
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
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Atualiza campos ao trocar usuário/curso selecionado
document.getElementById('selectUsuario').addEventListener('change', function() {
  if (tipoAtual === 'curso') {
    usuarioAtual = cursosList.find(c => c.id === this.value);
    document.getElementById('editNomeCurso').value = usuarioAtual?.nome || '';
    document.getElementById('editPreco').value = usuarioAtual?.preco || '';
    document.getElementById('editCargaHr').value = usuarioAtual?.cargaHoraria || '';
    document.getElementById('editDataTurma').value = usuarioAtual?.proximaTurma || '';
  } else {
    let lista = tipoAtual === 'funcionario' ? usuariosFuncionarios : usuariosAlunos;
    usuarioAtual = lista.find(u => u.id === this.value);
    document.getElementById('editNome').value = usuarioAtual?.nome || '';
    document.getElementById('editCpf').value = usuarioAtual?.cpf || '';
    document.getElementById('editEndereco').value = usuarioAtual?.endereco || '';
    document.getElementById('editTelefone').value = usuarioAtual?.telefone || '';
    document.getElementById('editRg').value = usuarioAtual?.rg || '';
    document.getElementById('editNascimento').value = usuarioAtual?.nascimento || '';
    document.getElementById('editAtribuicao').value = usuarioAtual?.atribuicao || '';
  }
});

// Editar usuário ou curso
document.getElementById('editForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!usuarioAtual) return;

  if (tipoAtual === 'curso') {
      const preco = document.getElementById('editPreco').value;
      const cargaHr = document.getElementById('editCargaHr').value;
      const dataTurma = document.getElementById('editDataTurma').value;
      
      firebase.firestore()
        .collection('cursos')
        .doc(usuarioAtual.id)
        .update({
          preco: preco,
          cargaHoraria: cargaHr,
          proximaTurma: dataTurma
        })
        .then(() => {
          showToast("Curso atualizado com sucesso!", "success");
          closeModal();
          fetchCursos();
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  } else {
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
          showToast("Usuário atualizado com sucesso!", "success");
          closeModal();
          findUsers(); // already calls fetchCursos but that's fine
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  }
});

// Função de Toast (Substitui os alerts nativos)
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Excluir usuário
document.getElementById('deleteButton').addEventListener('click', function() {
  if (!usuarioAtual) return;
  if (confirm(`Excluir ${usuarioAtual.nome}?`)) {
    firebase.firestore()
      .collection('usuarios')
      .doc(usuarioAtual.id)
      .delete()
      .then(() => {
        showToast("Usuário excluído!", "success");
        closeModal();
        findUsers();
      })
      .catch(error => {
        showToast("Erro ao excluir: " + error.message, "error");
      });
  }
});
