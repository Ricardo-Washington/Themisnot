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
firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Se o usuário não estiver logado, redirecione para a página de login
            window.location.href = "/login/login.html";
        }
    });

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    login(); // Chama a função de login
});

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    });
}



// Função para validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g,'');
    if(cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i=1; i<=9; i++) soma += parseInt(cpf[i-1]) * (11-i);
    resto = (soma*10)%11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i=1; i<=10; i++) soma += parseInt(cpf[i-1]) * (12-i);
    resto = (soma*10)%11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;
    return true;
}

// Função para validar telefone brasileiro
function validarTelefone(telefone) {
    telefone = telefone.replace(/\D/g, '');
    return /^(\d{10,11})$/.test(telefone);
}

// Abrir modal apenas uma vez por usuário
window.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('cadastroRealizado')) {
        document.getElementById('userModal').style.display = 'flex';
    }
});

// Fechar modal
function closeModal() {
    document.getElementById('userModal').style.display = 'none';
}

// Máscara CPF e Telefone
document.getElementById('cpf').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g,'');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = v;
});
document.getElementById('telefone').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g,'');
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    e.target.value = v;
});

// SUBMIT DO FORMULÁRIO
document.getElementById('userRegisterForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    // Limpa erros
    ['nome','nascimento','cpf','rg','telefone'].forEach(id => {
        document.getElementById(id+'Error').textContent = '';
    });

    // Coleta dados
    const nome = document.getElementById('nome').value.trim();
    const nascimento = document.getElementById('nascimento').value;
    const cpf = document.getElementById('cpf').value.trim();
    const rg = document.getElementById('rg').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const estadoCivil = document.getElementById('estadoCivil').value;
    const endereco = document.getElementById('endereco').value.trim();

    let valid = true;

    if (!nome) {
        document.getElementById('nomeError').textContent = 'Preencha o nome completo.';
        valid = false;
    }
    if (!nascimento) {
        document.getElementById('nascimentoError').textContent = 'Informe a data de nascimento.';
        valid = false;
    }
    if (!cpf || !validarCPF(cpf)) {
        document.getElementById('cpfError').textContent = 'CPF inválido.';
        valid = false;
    }
    if (!rg) {
        document.getElementById('rgError').textContent = 'Preencha o RG.';
        valid = false;
    }
    if (!telefone || !validarTelefone(telefone)) {
        document.getElementById('telefoneError').textContent = 'Telefone inválido.';
        valid = false;
    }

    if (!valid) return;

    // Salvar no Firestore
    try {
        await firebase.firestore().collection('usuarios').add({
            nome, nascimento, cpf, rg, telefone, estadoCivil, endereco,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        localStorage.setItem('cadastroRealizado', 'true');
        document.getElementById('userRegisterForm').style.display = 'none';
        document.getElementById('modalSuccess').style.display = 'block';
    } catch (err) {
        alert('Erro ao salvar cadastro. Tente novamente.');
    }
});

// ...existing code...