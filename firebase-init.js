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