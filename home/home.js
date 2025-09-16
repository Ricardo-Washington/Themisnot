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

// Inicialize o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}



const db = firebase.firestore();

// O objeto 'form' para fácil acesso aos elementos
const form = {
    nascimento: () => document.getElementById('nascimento'),
    cpf: () => document.getElementById('cpf'),
    rg: () => document.getElementById('rg'),
    telefone: () => document.getElementById('telefone'),
    nome: () => document.getElementById('nome'),
    estadoCivil: () => document.getElementById('estadoCivil'),
    endereco: () => document.getElementById('endereco'),
    atribuicao: () => document.getElementById('atribuicao'),
}

// Verifica o estado de autenticação e dados do usuário
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        // Busca o documento do usuário no Firestore
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (userDoc.exists) {
            const dados = userDoc.data();
            if (dados.atribuicao === 'adm') {
                window.location.href = "/adm/adm.html";
                return;
            }
        }
        // Se não existe, é o primeiro login. Abre o modal.
        if (!userDoc.exists) {
            openModal();
        }
    }
});

// Função para abrir o modal
function openModal() {
    document.getElementById('userModal').style.display = 'flex';
}

// Função para fechar o modal
function closeModal() {
   document.getElementById('userModal').style.display = 'none';
}

// Função para cadastrar dados no Firestore
async function cadastrarDados(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("Nenhum usuário autenticado.");
        return;
    }
    
    // Valida se todos os campos obrigatórios estão preenchidos
    if (!validarCamposObrigatorios()) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    
    const userData = {
        nome: form.nome().value,
        cpf: form.cpf().value,
        rg: form.rg().value,
        telefone: form.telefone().value,
        nascimento: form.nascimento().value,
        estadoCivil: form.estadoCivil().value,
        endereco: form.endereco().value,
        atribuicao: form.atribuicao().value,
        user: {
            uid: firebase.auth().currentUser.uid,
        }
    };

    try {
        await db.collection('usuarios').doc(user.uid).set(userData);
        console.log("Dados do usuário salvos com sucesso!");
        alert('Cadastro realizado com sucesso! Seja bem-vindo.');
        closeModal();
    } catch (error) {
        console.error("Erro ao salvar os dados do usuário:", error);
        alert("Erro ao cadastrar. Tente novamente.");
    }
}

// Função para validar todos os campos obrigatórios
function validarCamposObrigatorios() {
    const camposObrigatorios = [
        form.nome(),
        form.nascimento(),
        form.cpf(),
        form.rg(),
        form.telefone(),
        form.estadoCivil(),
        form.endereco(),
        form.atribuicao(),
    ];
    
    let todosPreenchidos = true;
    
    camposObrigatorios.forEach(campo => {
        if (!campo.value.trim()) {
            // Destaca o campo vazio
            campo.style.border = '2px solid red';
            // Mostra mensagem de erro se existir
            const errorElement = document.getElementById(campo.id + 'Error');
            if (errorElement) {
                errorElement.textContent = 'Este campo é obrigatório';
            }
            todosPreenchidos = false;
        } else {
            // Remove o destaque se o campo estiver preenchido
            campo.style.border = '';
            // Limpa mensagem de erro
            const errorElement = document.getElementById(campo.id + 'Error');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    });
    
    return todosPreenchidos;
}

// Adicione o listener de evento para a função cadastrarDados() no formulário
document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userRegisterForm');
    if (userForm) {
        userForm.addEventListener('submit', cadastrarDados);
        
        // Adiciona evento para remover o destaque quando o usuário começar a digitar
        const inputs = userForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.style.border = '';
                    const errorElement = document.getElementById(this.id + 'Error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
            });
        });
    }
});

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Validação simples de CPF (sem mudanças)
function validarCPF(cpf) { /* ... */ }

// Validação simples de telefone (sem mudanças)
function validarTelefone(tel) { /* ... */ }

// Máscaras (sem mudanças)
function aplicarMascara(id, formatador) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', e => {
            e.target.value = formatador(e.target.value.replace(/\D/g, ''));
        });
    }
}

aplicarMascara('cpf', v => v.replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2'));

aplicarMascara('telefone', v => v.replace(/^(\d{2})(\d)/, '($1) $2')
                                  .replace(/(\d{5})(\d{1,4})$/, '$1-$2'));