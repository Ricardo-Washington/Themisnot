// Função para limpar o formulário
function limparFormulario(formularioId) {
    const formulario = document.getElementById(formularioId);
    if (formulario) {
        formulario.reset(); // Reseta todos os campos do formulário
    } else {
        console.error(`Formulário com ID "${formularioId}" não encontrado.`);
    }
}

// Exemplo de função principal que chama limparFormulario
function finalizarAcao() {
    // Lógica principal da função
    console.log("Função principal executada.");

    // Chama a função para limpar o formulário
    limparFormulario("meuFormulario");
}

// Exemplo de uso
document.getElementById("botaoFinalizar").addEventListener("click", finalizarAcao);