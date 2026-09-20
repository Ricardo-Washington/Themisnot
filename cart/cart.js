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
        checkPaymentStatus();
        loadCart();
    }
});

// Ouvinte para mudanças no localStorage (comunicação entre guias)
window.addEventListener('storage', (e) => {
    if (e.key === 'payment_status') {
        handlePaymentStatusFromStorage(e.newValue);
    }
});

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

async function checkPaymentStatus() {
    const preferenceId = localStorage.getItem('mp_preference_id');
    const statusBox = document.getElementById('payment-status');

    if (!statusBox) {
        return { status: 'error', message: 'Elemento de status não encontrado.' };
    }

    if (!preferenceId || !/^[A-Za-z0-9_-]+$/.test(preferenceId)) {
        statusBox.style.display = 'block';
        statusBox.className = 'payment-status error';
        statusBox.textContent = '❌ Pedido de pagamento inválido.';
        localStorage.removeItem('mp_preference_id');
        return { status: 'error', message: 'Nenhum pagamento em andamento.' };
    }

    try {
        statusBox.style.display = 'block';
        statusBox.className = 'payment-status pending';
        statusBox.textContent = '⏳ Verificando status do pagamento...';

        const response = await fetch(`http://127.0.0.1:5000/check_payment/${preferenceId}`);
        const result = await response.json();

        if (response.ok) {
            if (result.status === 'success') {
                statusBox.className = 'payment-status success';
                statusBox.textContent = '✅ Pagamento aprovado! Obrigado.';
                localStorage.removeItem('cart');
                localStorage.removeItem('mp_preference_id');
                setTimeout(() => {
                    window.location.href = '/cart/compracerta.html';
                }, 1500);
            } else if (result.status === 'pending') {
                statusBox.className = 'payment-status pending';
                statusBox.textContent = '⏳ Pagamento pendente. Aguardando confirmação.';
            } else {
                statusBox.className = 'payment-status error';
                statusBox.textContent = `❌ ${result.message || 'Pagamento não aprovado.'}`;
                localStorage.removeItem('mp_preference_id');
            }
        } else {
            statusBox.className = 'payment-status error';
            statusBox.textContent = `❌ Erro ao verificar pagamento: ${result.message || response.statusText}`;
        }

        return result;
    } catch (error) {
        console.error('Erro:', error);
        statusBox.style.display = 'block';
        statusBox.className = 'payment-status error';
        statusBox.textContent = '⚠️ Erro ao verificar pagamento.';
        return { status: 'error', message: error.message };
    }
}

async function handlePaymentStatus() {
    return await checkPaymentStatus();
}

// Função para carregar o carrinho

function disablePaymentButtons() {
    const btnMp = document.getElementById('btn-mp');
    if (btnMp) {
        btnMp.disabled = true;
        btnMp.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Gerando Link...';
    }
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
        checkoutButton.disabled = true;
    }
}

function enablePaymentButtons() {
    const btnMp = document.getElementById('btn-mp');
    if (btnMp) {
        btnMp.disabled = false;
        btnMp.innerHTML = '<i class="fas fa-handshake"></i> Pagar via MP';
    }
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
        checkoutButton.disabled = false;
    }
}

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
    if (cart.length === 0) {
        alert("Carrinho vazio!");
        return;
    }

    let total = 0;
    cart.forEach(item => total += item.price * (item.quantity || 1));

    // Desabilitar o botão e botar ícone girando para o usuário não clicar duas vezes ansioso
    const btnMp = document.getElementById('btn-mp');
    btnMp.disabled = true;
    btnMp.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Gerando Link...';

    try {
        const payload = {
            itensCart: cart.map(item => ({
                name: item.name || item.nome || 'Produto Thémis',
                price: Number(String(item.price).replace(',', '.')) || 0,
                quantity: Number(item.quantity) || 1
            }))
        };

        const backendUrl = "http://127.0.0.1:5000/create_preference";
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        let resultado;
        try {
            resultado = await response.json();
        } catch (parseError) {
            const text = await response.text();
            throw new Error(`Resposta inválida do servidor: ${parseError.message}. Conteúdo: ${text}`);
        }
        console.log("Resposta Mercado Pago:", resultado);

        if (!response.ok || resultado.status !== "success") {
            throw new Error(resultado.message || `Erro ao gerar preferência (${response.status})`);
        }

        const checkoutUrl = resultado.init_point || resultado.sandbox_init_point;
        const preferenceId = resultado.preference_id || resultado.id;

        console.log("Redirecionando para:", checkoutUrl);
        console.log("Preference ID:", preferenceId);

        if (!checkoutUrl || !preferenceId || !/^[A-Za-z0-9_-]+$/.test(String(preferenceId))) {
            throw new Error("Resposta inválida da API de pagamento.");
        }

        localStorage.setItem('mp_preference_id', String(preferenceId));
        localStorage.setItem('mp_payment_started', new Date().toISOString());

        document.getElementById('checkout-modal').style.display = 'none';
        window.location.href = checkoutUrl;
    } catch (error) {
        enablePaymentButtons();
        console.error("Erro na integração com Mercado Pago:", error);
        alert("Desculpe, ocorreu um erro ao gerar o pagamento. Tente novamente. " + error.message);
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