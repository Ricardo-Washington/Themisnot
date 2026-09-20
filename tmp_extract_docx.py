import os
import zipfile
import re

paths = [r'contratos\Template TCC_VERSÃO 1.docx', r'contratos\NOVO CONTRATO.docx']
patterns = [
    'Tabela 11',
    'Especificação de Casos de Uso',
    'CAPÍTULO IV', 'Capítulo IV', 'CAPITULO IV',
    'UC001', 'UC002', 'UC003', 'UC004', 'UC005', 'UC006',
    'Gerenciar Alunos', 'Gerenciar Funcionários', 'Realizar Login',
    'Gerar Contrato PDF', 'Realizar Logout', 'Gerenciar Cursos',
    'Autenticar Usuário', 'Registrar Usuário', 'Gerenciar Perfil',
    'Gerenciar Carrinho', 'Visualizar Cursos', 'Visualizar Produtos',
    'Gerenciar Usuários'
]
for path in paths:
    if os.path.exists(path):
        print('FILE', path)
        with zipfile.ZipFile(path) as z:
            xml = z.read('word/document.xml').decode('utf-8', errors='ignore')
        for pat in patterns:
            idx = xml.find(pat)
            if idx != -1:
                start = max(0, idx-400)
                end = min(len(xml), idx+600)
                snippet = xml[start:end]
                snippet = re.sub(r'<[^>]+>', ' ', snippet)
                snippet = re.sub(r'\s+', ' ', snippet).strip()
                print('===', pat, '===')
                print(snippet)
                print()
        print('\n' + '='*80 + '\n')
    else:
        print('MISSING', path)
