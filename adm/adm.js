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


findCadater();
/*buscar dasdos do usuario*/
function findCadater(){
firebase.firestore()
  .collection('usuarios')
  .get()
  .then(snapshot => {
    snapshot.docs.forEach(doc => {
      console.log(doc.data());
    });
    console.log(snapshot.docs.collections);
    const dadosuser =  snapshot.docs.map(doc => doc.data());
  })

}
