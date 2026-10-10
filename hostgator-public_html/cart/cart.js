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

// Verifica autenticação
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "/login.html";
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
        const details = document.createElement('div');
        const name = document.createElement('h4');
        name.textContent = String(item.name || 'Produto');
        const unitPrice = document.createElement('p');
        unitPrice.textContent = `Preço unitário: R$ ${Number(item.price).toFixed(2).replace('.', ',')}`;
        const controls = document.createElement('div');
        controls.className = 'quantity-controls';
        const decrease = document.createElement('button');
        decrease.type = 'button';
        decrease.className = 'qty-btn';
        decrease.textContent = '-';
        decrease.addEventListener('click', () => updateQuantity(index, -1));
        const quantity = document.createElement('span');
        quantity.className = 'qty-value';
        quantity.textContent = String(item.quantity);
        const increase = document.createElement('button');
        increase.type = 'button';
        increase.className = 'qty-btn';
        increase.textContent = '+';
        increase.addEventListener('click', () => updateQuantity(index, 1));
        controls.append(decrease, quantity, increase);
        const subtotal = document.createElement('p');
        subtotal.textContent = `Subtotal: R$ ${(Number(item.price) * item.quantity).toFixed(2).replace('.', ',')}`;
        details.append(name, unitPrice, controls, subtotal);
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-button';
        removeButton.textContent = 'Remover';
        removeButton.addEventListener('click', () => removeFromCart(index));
        itemDiv.append(details, removeButton);
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

// Função logout (copiada de home.js)
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/index.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}