// Módulo Central de Auditoria - Rastreia ações na plataforma
// Depende do Firebase SDK e firebase-config-shared.js

window.registrarLogAudit = function(acao, tipoUsuarioLogado, detalhes) {
    const user = firebase.auth().currentUser;
    // Se não tiver usuário logado, salva como Anônimo
    const uid = user ? user.uid : 'anonimo';
    const email = user ? user.email : 'N/A';

    const logData = {
        uid: uid,
        email: email,
        tipoUsuario: tipoUsuarioLogado, // Ex: 'adm', 'funcionario', 'aluno'
        acao: acao,
        detalhes: detalhes,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        pagina: window.location.pathname
    };

    // Salva na coleção "logs_auditoria" no Firestore
    db.collection('logs_auditoria').add(logData)
        .then(() => {
            console.log(`Log => [${acao}] registrado com sucesso.`);
        })
        .catch(err => {
            console.error("Falha ao registrar log de auditoria: ", err);
        });
};
