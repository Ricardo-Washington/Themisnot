// A sua configuração do Firebase já está correta
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

const db = firebase.firestore();

// OTIMIZAÇÃO: A verificação do modal deve ser feita aqui.
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        // Se não houver usuário logado, redireciona para a página de login
        window.location.href = "/login/login.html";
    } else {
        // Se o usuário estiver logado, verifique se ele já preencheu os dados
        const userDocRef = db.collection('usuarios').doc(user.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            // Se o documento não existir, é o primeiro acesso: exibe o modal
            console.log("É a primeira vez que o usuário loga. Exibindo o modal.");
            document.getElementById('userModal').style.display = 'flex';
        } else {
            // Se o documento existe, não faz nada
            console.log("Usuário já tem dados cadastrados.");
        }
    }
});


// FUNÇÕES DE AÇÃO DO USUÁRIO
// Função para fazer logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Função para cadastrar dados do usuário no Firestore
async function cadastrarDados(event) {
    event.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Erro: Nenhum usuário autenticado. Tente fazer o login novamente.");
        return;
    }
    
    const dadosUsuario = {
        nome: document.getElementById('nome').value,
        rg: document.getElementById('rg').value,
        telefone: document.getElementById('telefone').value,
        nascimento: document.getElementById('nascimento').value,
        estadoCivil: document.getElementById('estadoCivil').value,
        endereco: document.getElementById('endereco').value,
        uid: user.uid,
    };
    
    // Validação simples
    if (!dadosUsuario.nome || !dadosUsuario.rg) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    
    try {
        await db.collection('usuarios').doc(user.uid).set(dadosUsuario);
        console.log("Dados do usuário salvos com sucesso!");
        
        // Esconde o formulário e mostra a mensagem de sucesso
        document.getElementById('userRegisterForm').style.display = 'none';
        document.getElementById('modalSuccess').style.display = 'flex';
        
    } catch (error) {
        console.error("Erro ao salvar os dados do usuário: ", error);
        alert("Erro ao cadastrar. Verifique a conexão e tente novamente.");
    } finally {
        // Você pode remover esta linha, já que a mensagem de sucesso está dentro do modal
        // E o modal é escondido quando o botão "Fechar" é clicado
    }
}

// FUNÇÕES DE VALIDAÇÃO E MÁSCARAS
// Validação simples de CPF


// Validação simples de telefone
function validarTelefone(tel) { /* ... */ }
 
// Máscaras
/*function aplicarMascara(id, formatador) {
    document.getElementById(id).addEventListener('input', e => {
        e.target.value = formatador(e.target.value.replace(/\D/g, ''));
    });
}
*/



function cadastrarDados() {
    const cadastrarDados = {
        nome: form.nome.value,
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