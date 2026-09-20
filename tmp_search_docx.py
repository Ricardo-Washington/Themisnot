import os, zipfile, re
paths = [r'contratos\Template TCC_VERSÃO 1.docx', r'contratos\NOVO CONTRATO.docx']
patterns = [r'UC00[1-6]', 'Gerenciar Alunos', 'Gerenciar Funcionários', 'Realizar Login', 'Gerar Contrato', 'Realizar Logout', 'Gerenciar Cursos', 'Autenticar Usuário', 'Registrar Usuário', 'Gerenciar Perfil', 'Gerenciar Carrinho', 'Visualizar Cursos', 'Visualizar Produtos', 'Gerenciar Usuários', 'Especificação de Casos de Uso']
for path in paths:
    print('FILE', path)
    if not os.path.exists(path):
        print('MISSING')
        continue
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8', errors='ignore')
    for pat in patterns:
        idx = xml.find(pat)
        if idx != -1:
            start = max(0, idx-200)
            end = min(len(xml), idx+400)
            snippet = xml[start:end]
            snippet = re.sub(r'<[^>]+>', ' ', snippet)
            snippet = re.sub(r'\s+', ' ', snippet)
            print('PATTERN', pat, 'SNIPPET', snippet)
    print('---')
