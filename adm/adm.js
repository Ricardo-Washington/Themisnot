function findperfil(user){
firebase.firestore()
    .collection('usuarios')
    .where('user.uid', '==', user.uid)
    .orderBy('nome', 'asc')
    .get()
    .then(snapshot => {
    if (!snapshot.empty) {
        const dados = snapshot.docs[0].data();
        document.getElementById('nome').textContent = dados.nome;
        document.getElementById('cpf').textContent = dados.cpf;
        document.getElementById('rg').textContent = dados.rg;
        document.getElementById('telefone').textContent = dados.telefone;
        document.getElementById('nascimento').textContent = dados.nascimento;
        document.getElementById('estadoCivil').textContent = dados.estadoCivil;
        document.getElementById('endereco').textContent = dados.endereco;
    } else {
        alert("Dados do usuário não encontrados.");
    }
    })
    .catch(error => {
    console.error("Erro ao buscar dados:", error);
    });
}