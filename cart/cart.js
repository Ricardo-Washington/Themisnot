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
    
    // Salvar compra finalizada no banco de dados
    const user = firebase.auth().currentUser;
    if (user) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        let total = 0;
        cart.forEach(item => total += item.price * (item.quantity || 1));
        
        db.collection('compras_finalizadas').add({
            userId: user.uid,
            items: cart,
            total: total,
            date: firebase.firestore.Timestamp.now()
        }).then(() => {
            if (window.registrarLogAudit) registrarLogAudit(`Finalizou Compra: R$ ${total.toFixed(2)}`, 'aluno/cliente', {qtdItens: cart.length});
            console.log('Compra salva com sucesso!');
        }).catch((error) => {
            console.error('Erro ao salvar compra:', error);
        });
    }
    
    // Simular que o pagamento foi efetuado e limpar carrinho
    localStorage.removeItem('cart');
    loadCart();
    alert('Pagamento confirmado! Retire seus produtos na Academia Thémis em Águas Lindas de Goiás.');
}

// Função logout (copiada de home.js)
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/index/index.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}