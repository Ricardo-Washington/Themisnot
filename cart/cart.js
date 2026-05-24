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
        handlePaymentStatus();
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

async function handlePaymentStatus() {
    const status = getQueryParam('payment');
    const statusBox = document.getElementById('payment-status');
    if (!statusBox || !status) return;

    statusBox.style.display = 'block';
    if (status === 'success') {
        statusBox.className = 'payment-status success';
        statusBox.textContent = 'Compra finalizada com sucesso.';
        localStorage.setItem('payment_status', 'success');
        // Carrinho será limpo automaticamente após sucesso
    } else if (status === 'pending') {
        statusBox.className = 'payment-status pending';
        statusBox.textContent = 'Pagamento pendente. Verifique seu Mercado Pago; o carrinho permanece salvo para você.';
        alert('A compra não foi concluída ainda. O pagamento está pendente e o carrinho permanece salvo.');
    } else {
        statusBox.className = 'payment-status error';
        statusBox.textContent = 'Pagamento não concluído. O carrinho permanece salvo e você pode tentar novamente.';
        alert('A compra não foi efetuada com sucesso. Por favor, tente novamente ou revise os dados do pagamento.');
    }

    window.history.replaceState({}, document.title, window.location.pathname);
}

function handlePaymentStatusFromStorage(status) {
    const statusBox = document.getElementById('payment-status');
    if (!statusBox) return;

    statusBox.style.display = 'block';
    if (status === 'success') {
        statusBox.className = 'payment-status success';
        statusBox.textContent = 'Compra finalizada com sucesso.';
    }
    // Limpar o localStorage após mostrar
    localStorage.removeItem('payment_status');
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
        const paymentWindow = window.open('about:blank', '_blank');
        if (!paymentWindow) {
            enablePaymentButtons();
            alert('O navegador bloqueou a abertura da janela de pagamento. Permita pop-ups para continuar.');
            return;
        }

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

        const resultado = await response.json();

        if (!response.ok || resultado.status !== "success") {
            throw new Error(resultado.message || `Erro ao gerar preferência (${response.status})`);
        }

        paymentWindow.location.href = resultado.init_point || resultado.sandbox_init_point;
        closeModal();
        enablePaymentButtons();
    } catch (error) {
        enablePaymentButtons();
        console.error("Erro na integração com Mercado Pago: ", error);
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