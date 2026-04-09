// Configuração do Firebase (se necessário)
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
        loadCart();
    }
});

// Função para carregar o carrinho
function loadCart() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    let total = 0;

    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Seu carrinho está vazio.</p>';
        totalPrice.textContent = '0,00';
        return;
    }

    // Migra a estrutura antiga do carrinho, se necessário
    let migrated = false;
    let newCart = [];
    cart.forEach(item => {
        if (!item.quantity) {
             let existing = newCart.find(i => i.name === item.name);
             if (existing) {
                 existing.quantity++;
             } else {
                 newCart.push({ ...item, quantity: 1 });
             }
             migrated = true;
        } else {
            newCart.push(item);
        }
    });

    if (migrated) {
        cart = newCart;
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <p>Preço unitário: R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <p>Subtotal: R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
            </div>
            <button class="remove-button" onclick="removeFromCart(${index})">Remover</button>
        `;
        cartItems.appendChild(itemDiv);
        total += item.price * item.quantity;
    });

    totalPrice.textContent = total.toFixed(2).replace('.', ',');
}

// Função para remover item do carrinho
function removeFromCart(index) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Função para atualizar a quantidade do item
function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
    }
}

// Função para finalizar compra
function checkout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    // Calcular total
    let total = 0;
    cart.forEach(item => total += item.price * (item.quantity || 1));

    // Mostrar modal
    document.getElementById('modal-total').textContent = total.toFixed(2).replace('.', ',');
    document.getElementById('checkout-modal').style.display = 'flex';

    // Limpar carrinho após checkout (opcional, ou após confirmação)
    // localStorage.removeItem('cart');
    // loadCart();
}

// Função para fechar modal
function closeModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

// Integração com Servidor Python (Flask) & Mercado Pago
async function pagarMercadoPago() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Você precisa estar logado!");
        return;
    }

    // Pega as coisas que estão no localStorage (A memória do navegador)
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return;

    let total = 0;
    cart.forEach(item => total += item.price * (item.quantity || 1));

    // Desabilitar o botão e botar ícone girando para o usuário não clicar duas vezes ansioso
    const btnMp = document.getElementById('btn-mp');
    btnMp.disabled = true;
    btnMp.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Gerando Link...';

    try {
        // [FUTURO]: Salva a intenção de compra no banco ANTES de ir para o Mercado Pago, pra ter o registro.
        const docRef = await db.collection('compras_finalizadas').add({
            userId: user.uid,
            items: cart,
            total: total,
            status: "pendente",
            date: firebase.firestore.Timestamp.now()
        });
        
        if (window.registrarLogAudit) registrarLogAudit(`Gerou Link Pagamento: R$ ${total.toFixed(2)}`, 'aluno/cliente', {qtdItens: cart.length});

        // A PONTE DE REDE: Bate na porta do servidor Python que montamos passando o carrinho via 'JSON'
        const response = await fetch("http://localhost:5000/create_preference", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ itensCart: cart })
        });

        // Abre o json que o Python respondeu
        const resultado = await response.json();

        // Verifica se o Python deu a bandeira verde
        if (resultado.status === "success") {
            // Limpa o carrinho pro cliente não pagar duas vezes sem querer
            localStorage.removeItem('cart');
            loadCart();

            // EJETAR! O Navegador puxa o usuário para fora do site, caindo na Tela de CheckOut do MP.
            window.location.href = resultado.init_point || resultado.sandbox_init_point;
        } else {
            // Se o Python reclamou de algo, joga a bomba pro 'catch' ali embaixo mostrar o Alerta Vermelho
            throw new Error(resultado.message || "Erro desconhecido ao gerar o link.");
        }
    } catch (error) {
        console.error("Erro na integração com Mercado Pago: ", error);
        alert("Desculpe, ocorreu um erro ao gerar o pagamento. Tente novamente.");
        btnMp.disabled = false;
        btnMp.innerHTML = '<i class="fas fa-handshake"></i> Pagar via MP';
    }
}

// Função logout (copiada de home.js)
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/index/index.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}