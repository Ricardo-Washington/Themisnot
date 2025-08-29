import { initializeApp } from "firebase/app";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDVK6hzW1gifPrjDQrC00I9GWQqumaY3PE",
  authDomain: "themis-bcaa4.firebaseapp.com",
  projectId: "themis-bcaa4",
  storageBucket: "themis-bcaa4.appspot.com", // Corrigido
  messagingSenderId: "244101876997",
  appId: "1:244101876997:web:fcee5a85d3506417c7fb6c"
};

// Inicialize o Firebase apenas uma vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Inicialize o Firestore
const db = firebase.firestore();