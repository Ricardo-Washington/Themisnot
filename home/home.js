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
    cep: () => document.getElementById('cep'),
    numero: () => document.getElementById('numero'),
    logradouro: () => document.getElementById('logradouro'),
    bairro: () => document.getElementById('bairro'),
    cidade: () => document.getElementById('cidade'),
    uf: () => document.getElementById('uf'),
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
           // Injeta a saudacao do usuario na navbar
           if (dados && (dados.nome || dados.nomeCompleto)) {
               const nomeExibicao = dados.nome || dados.nomeCompleto;
               const pNome = nomeExibicao.split(' ')[0];
               document.querySelectorAll('.user-greeting').forEach(el => {
                   let greetingHTML = `<a href="/meuPerfil/meu_perfil.html" style="color: inherit; text-decoration: none;" title="Ver Meu Perfil">Olá, ${pNome} <i class="fa fa-user-circle"></i></a>`;
                   
                   // Se for funcionário, mostra o atalho
                   if (dados.atribuicao === 'funcionario' || dados.atribuicao === 'admin' || dados.atribuicao === 'adm') {
                       greetingHTML += `<a href="/rgFuncionario/rgrgfuncionario.html" style="margin-left: 15px; color: var(--orange); font-size: 0.85em; text-decoration: underline; font-weight: bold;"><i class="fas fa-tools"></i> Painel Funcionário</a>`;
                   }
                   // Se for administrador top-level, mostra o atalho extra
                   if (dados.atribuicao === 'adm') {
                       greetingHTML += `<a href="/adm/adm.html" style="margin-left: 15px; color: #ff3333; font-size: 0.85em; text-decoration: underline; font-weight: bold;"><i class="fas fa-crown"></i> Painel Master</a>`;
                   }
                   
                   el.innerHTML = greetingHTML;
               });
           }
            // Se já existe cadastro, NÃO abre o modal!
            return;
        }
        // Se não existe, é o primeiro login. Abre o modal.
        openModal();
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
    
    const enderecoCompleto = `${form.logradouro().value}, ${form.numero().value} - ${form.bairro().value}, ${form.cidade().value}/${form.uf().value}`;

    const userData = {
        nome: form.nome().value,
        cpf: form.cpf().value,
        rg: form.rg().value,
        telefone: form.telefone().value,
        nascimento: form.nascimento().value,
        estadoCivil: form.estadoCivil().value,
        cep: form.cep().value,
        logradouro: form.logradouro().value,
        numero: form.numero().value,
        bairro: form.bairro().value,
        cidade: form.cidade().value,
        uf: form.uf().value,
        endereco: enderecoCompleto,
        atribuicao: form.atribuicao().value,
        user: {
            uid: firebase.auth().currentUser.uid,
        },
        dataCadastro: new Date().toISOString().slice(0, 10) // Salva a data do cadastro automaticamente
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
        form.cep(),
        form.numero(),
        form.logradouro(),
        form.bairro(),
        form.cidade(),
        form.uf(),
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

        // Preenche dados do endereço automaticamente quando o CEP é completo
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('input', function() {
                const somenteDigitos = this.value.replace(/\D/g, '');
                if (somenteDigitos.length === 8) {
                    buscarEnderecoPorCep(somenteDigitos);
                }
            });
        }
    }

    // Verifica se deve abrir o modal de cadastro
    if (localStorage.getItem('abrirModalCadastro') === 'true') {
        openModal();
        localStorage.removeItem('abrirModalCadastro');
    }

    // Toggle menu mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// Função para adicionar item ao carrinho
function addToCart(name, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ name, price });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Item adicionado ao carrinho!');
}

// Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Busca de endereço automático pelo CEP usando ViaCEP
async function buscarEnderecoPorCep(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        return;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (data.erro) {
            throw new Error('CEP não encontrado');
        }

        form.logradouro().value = data.logradouro || '';
        form.bairro().value = data.bairro || '';
        form.cidade().value = data.localidade || '';
        form.uf().value = data.uf || '';

        // Remove erros antigos se o CEP foi preenchido com sucesso
        ['logradouro', 'bairro', 'cidade', 'uf', 'cep'].forEach(fieldId => {
            const errorElement = document.getElementById(fieldId + 'Error');
            if (errorElement) errorElement.textContent = '';
        });
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        const cepError = document.getElementById('cepError');
        if (cepError) cepError.textContent = 'Não foi possível buscar o CEP. Verifique e tente novamente.';
    }
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