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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Verifica autenticação
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "/login/login.html";
    } else {
        carregarLojaProdutos();
    }
});

// Função para adicionar item ao carrinho
function addToCart(name, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({ name, price, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Item adicionado ao carrinho!');
}

// Função logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/index/index.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Carregar produtos do banco de dados na tela de Produtos
async function carregarLojaProdutos() {
    const produtosContainer = document.getElementById('produtos-container');
    if (!produtosContainer) return;
    
    produtosContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Carregando produtos...</p>';
    
    try {
        const snapshot = await db.collection("produtos").get();
        if (snapshot.empty) {
            produtosContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Nenhum produto encontrado na loja.</p>';
            return;
        }
        
        produtosContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const produto = doc.data();
            
            // Formatando preco para numero compatível com o addToCart
            let precoNumerico = 0;
            if (typeof produto.preco === 'string') {
                const valorFormatado = produto.preco.replace(/\./g, '').replace(',', '.');
                precoNumerico = parseFloat(valorFormatado);
            } else if (typeof produto.preco === 'number') {
                precoNumerico = produto.preco;
            }
            if (isNaN(precoNumerico)) precoNumerico = 0;
            
            const disabledAttr = (produto.estoque && parseInt(produto.estoque) === 0) ? 'disabled style="background-color: #555; cursor: not-allowed;"' : '';
            const txtBotao = (produto.estoque && parseInt(produto.estoque) === 0) ? 'Esgotado' : 'Adicionar ao Carrinho';

            const item = `
                <div class="produto-item">
                    <img src="${produto.imagem || '/img/logo.png'}" alt="${produto.nome}">
                    <h3>${produto.nome}</h3>
                    <p style="font-size: 0.9em; opacity: 0.8; margin-bottom: 10px;">${produto.descricao || ''}</p>
                    <p>Preço: R$ ${produto.preco || '0,00'}</p>
                    <button onclick="addToCart('${produto.nome}', ${precoNumerico})" ${disabledAttr}>${txtBotao}</button>
                </div>
            `;
            produtosContainer.innerHTML += item;
        });
    } catch (error) {
        console.error("Erro ao carregar vitrine de produtos:", error);
        produtosContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Erro ao carregar os produtos.</p>';
    }
}