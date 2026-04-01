with open("rgFuncionario/rgfuncionario.js", "r", encoding="utf-8") as f:
    text = f.read()

# Substitutions
text = text.replace('await db.collection("alunos").doc(alunoId).update(alunoData);', 'await db.collection("usuarios").doc(alunoId).update(alunoData);')
text = text.replace('await db.collection("alunos").add(alunoData);', 'await db.collection("usuarios").add({ ...alunoData, atribuicao: "aluno" });')
text = text.replace('const snapshot = await db.collection("alunos").get();', 'const snapshot = await db.collection("usuarios").where("atribuicao", "==", "aluno").get();')
text = text.replace('await db.collection("alunos").doc(id).delete();', 'await db.collection("usuarios").doc(id).delete();')

old_row = """            <tr>
                <td>${aluno.nome}</td>
                <td>${aluno.cpf || ''}</td>
                <td>${aluno.rg || ''}</td>
                <td>${aluno.idade || ''}</td>
                <td>
                    <button onclick="editarAluno('${doc.id}', '${aluno.nome}', '${aluno.email}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.cursoSolicitado}', '${aluno.idade}', '${aluno.dataInicio}', '${aluno.formaPagamento}')">Editar</button>
                    <button onclick="excluirAluno('${doc.id}')">Excluir</button>
                    <button onclick="criarContrato('${aluno.nome}', '${aluno.idade}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.formaPagamento}', '${aluno.cursoSolicitado}', '${aluno.dataInicio}')">Criar Contrato</button>
                </td>
            </tr>"""

new_row = """            <tr>
                <td><strong>${aluno.nome}</strong></td>
                <td>${aluno.cpf || ''}</td>
                <td>${aluno.rg || ''}</td>
                <td>${aluno.idade || ''}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editarAluno('${doc.id}', '${aluno.nome}', '${aluno.email}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.cursoSolicitado}', '${aluno.idade}', '${aluno.dataInicio}', '${aluno.formaPagamento}', '${aluno.turno || ''}')" title="Editar Aluno"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn doc-btn" onclick="criarContrato('${aluno.nome}', '${aluno.idade}', '${aluno.cpf}', '${aluno.rg}', '${aluno.orgaoRg}', '${aluno.endereco}', '${aluno.telefone}', '${aluno.telefoneAlt}', '${aluno.formaPagamento}', '${aluno.cursoSolicitado}', '${aluno.dataInicio}', '${aluno.turno || ''}')" title="Gerar Contrato PDF"><i class="fa-solid fa-file-signature"></i></button>
                    <button class="action-btn delete-btn" onclick="excluirAluno('${doc.id}')" title="Excluir Aluno"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>"""

text = text.replace(old_row, new_row)

old_editar = """function editarAluno(id, nome, email, cpf, rg, orgaoRg, endereco, telefone, telefoneAlt, cursoSolicitado, idade, dataInicio, formaPagamento) {
    document.getElementById("alunoId").value = id;
    document.getElementById("nome").value = nome;
    document.getElementById("email").value = email;
    document.getElementById("cpf").value = cpf;
    document.getElementById("rg").value = rg;
    document.getElementById("orgaoRg").value = orgaoRg;
    document.getElementById("endereco").value = endereco;
    document.getElementById("telefone").value = telefone;
    document.getElementById("telefoneAlt").value = telefoneAlt;
    document.getElementById("formaPagamento").value = formaPagamento || '';
    document.getElementById("cursoSolicitado").value = cursoSolicitado || '';
    document.getElementById("dataInicio").value = dataInicio || '';
    document.getElementById("turno").value = turno || '';
    document.getElementById("idade").value = idade || '';
}"""

new_editar = """function editarAluno(id, nome, email, cpf, rg, orgaoRg, endereco, telefone, telefoneAlt, cursoSolicitado, idade, dataInicio, formaPagamento, turnoParam) {
    document.getElementById("alunoId").value = id;
    document.getElementById("nome").value = nome;
    document.getElementById("email").value = email;
    document.getElementById("cpf").value = cpf;
    document.getElementById("rg").value = rg;
    document.getElementById("orgaoRg").value = orgaoRg;
    document.getElementById("endereco").value = endereco;
    document.getElementById("telefone").value = telefone;
    document.getElementById("telefoneAlt").value = telefoneAlt || '';
    document.getElementById("formaPagamento").value = formaPagamento || '';
    document.getElementById("cursoSolicitado").value = cursoSolicitado || '';
    document.getElementById("dataInicio").value = dataInicio || '';
    document.getElementById("turno").value = turnoParam || '';
    document.getElementById("idade").value = idade || '';

    // Modifica titulo e abre modal
    const mt = document.getElementById('modalAlunoTitle');
    if (mt) mt.innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Aluno';
    const m = document.getElementById('modalAluno');
    if (m) m.classList.add('active');
}"""
text = text.replace(old_editar, new_editar)

# Reset form closing modal
text = text.replace('document.getElementById("alunoForm").reset();\n        carregarAlunos();', 'document.getElementById("alunoForm").reset();\n        fecharModalAluno();\n        carregarAlunos();')

text += """
// Funcionalidade do modal
function fecharModalAluno() {
    const modalAluno = document.getElementById('modalAluno');
    if (modalAluno) modalAluno.classList.remove('active');
}
"""

with open("rgFuncionario/rgfuncionario.js", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCESSO")
