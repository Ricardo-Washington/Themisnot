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
} else {
    firebase.app(); // Use a instância já inicializada
}
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } 
});

window.addEventListener('DOMContentLoaded', () => {
  const jaLogouAntes = localStorage.getItem('usuarioLogado');
  if (!jaLogouAntes) {
    // Mostra o modal na primeira vez
    document.getElementById('userModal').style.display = 'flex';

    // Marca que o usuário já logou
    localStorage.setItem('usuarioLogado', 'true');
  }
});


// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    });
}

// Validação simples de CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += cpf[i] * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto != cpf[9]) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += cpf[i] * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  
}

// Validação simples de telefone
function validarTelefone(tel) {
  tel = tel.replace(/\D/g, '');
}


// Máscaras
function aplicarMascara(id, formatador) {
  document.getElementById(id).addEventListener('input', e => {
    e.target.value = formatador(e.target.value.replace(/\D/g, ''));
  });

aplicarMascara('cpf', v => v.replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d)/, '$1.$2')
                            .replace(/(\d{3})(\d{1,2})$/, '$1-$2'));

aplicarMascara('telefone', v => v.replace(/^(\d{2})(\d)/, '($1) $2')
                                 .replace(/(\d{5})(\d{1,4})$/, '$1-$2'));
}

// Mostra o modal apenas na primeira vez que o usuário loga



function cadastrarDados() {
    const cadastrarDados = {
        nome: form.nome.value,
        cpf: form.cpf.value,
        rg: form.rg.value,
        telefone: form.telefone.value,
        nascimento: form.nascimento.value,
        estadoCivil: form.estadoCivil.value,
        endereco: form.endereco.value,
        user:{
            uid: firebase.auth().currentUser.uid,
        }
    };
    console.log(cadastrarDados);
    
}





const form = {
    nascimento: () => document.getElementById('nascimento'),
    cpf: () => document.getElementById('cpf'),
    rg: () => document.getElementById('rg'),
    telefone: () => document.getElementById('telefone'),
    nome: () => document.getElementById('nome'),
    email: () => document.getElementById('email'),
    estadoCivil: () => document.getElementById('estadoCivil'),
    endereco: () => document.getElementById('endereco'),
}
