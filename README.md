# Thémis

Sistema web desenvolvido como parte de um projeto de TCC, com foco em uma plataforma de vendas e capacitação para o segmento de segurança privada, vigilância e cursos profissionalizantes.

## Visão geral
O projeto reúne um front-end em HTML, CSS e JavaScript com autenticação e armazenamento de dados em Firebase. A aplicação permite:

- cadastro e login de usuários;
- visualização de produtos e cursos;
- carrinho de compras;
- cadastro de dados complementares dos usuários;
- diferenciação de acessos para clientes, funcionários e administradores.

## Tecnologias utilizadas
- Front-end: HTML, CSS, JavaScript
- Autenticação e banco de dados: Firebase Auth + Firestore
- Hospedagem: Apache/cPanel (HostGator)
- Servidor local para testes: Live Server ou qualquer servidor estático

## Estrutura do projeto
Todas as páginas HTML ficam na raiz do projeto. Os arquivos CSS e JavaScript continuam organizados por funcionalidade nas pastas correspondentes, como [home](home), [products](products), [cart](cart), [login](login), [registerEmployee](registerEmployee), [Registrice](Registrice), [cursos](cursos), [meuPerfil](meuPerfil), [adm](adm), [boletim](boletim), [disciplinas](disciplinas), [professor](professor) e [rgFuncionario](rgFuncionario). A pasta [js](js) contém a configuração compartilhada do Firebase e scripts de apoio.

## Funcionalidades principais
### Autenticação
O login é realizado com e-mail e senha pelo Firebase Authentication. Após o login, o sistema verifica a atribuição do usuário no Firestore e redireciona para a área correta.

### Cadastro de usuário
Ao fazer o primeiro acesso, o sistema pode abrir um modal para completar os dados cadastrais, como nome, CPF, RG, telefone, endereço e atribuição.

### Catálogo de produtos
Os produtos são carregados dinamicamente a partir da coleção produtos do Firestore.

### Carrinho e pagamento
Os itens adicionados ao carrinho são armazenados no localStorage. A finalização de compras está desativada; o site publicado não inclui um serviço de pagamento.

## Publicar na HostGator (cPanel)
1. No cPanel, abra o Gerenciador de Arquivos e entre na pasta `public_html` do domínio.
2. Envie `hostgator-public_html-cpanel.zip` e extraia seu conteúdo diretamente nessa pasta (incluindo o arquivo oculto `.htaccess`). O `index.html` precisa ficar diretamente em `public_html`, não dentro de uma subpasta.
4. Depois de extrair, apague o ZIP enviado; mantenha as páginas e pastas extraídas.
5. Ative o SSL/HTTPS do domínio no cPanel. O arquivo `.htaccess` incluído desativa a listagem de pastas e define `index.html` como página inicial; ele não força HTTPS.
6. No Firebase Console, adicione o domínio publicado em Authentication > Settings > Authorized domains. Confirme também que Authentication, Firestore, regras de segurança e os serviços Firebase usados pelo projeto estão configurados para esse domínio.

O ZIP contém apenas as páginas e os recursos estáticos necessários ao site. Não envie `.env`, `.venv`, `functions`, `node_modules`, contratos ou o backend Python para `public_html`. O carrinho permanece disponível para consulta, mas a compra online fica identificada como indisponível.

## Executar o front-end localmente
### 1. Pré-requisitos
- Um servidor estático local (opcional, mas recomendado)
- Conta Firebase configurada

### 2. Configurar o Firebase
As configurações do Firebase já estão presentes nos arquivos de JavaScript do projeto. Para uso em outro ambiente, substitua os valores de configuração pelos dados do seu projeto Firebase.

### 3. Rodar o front-end
Você pode abrir o projeto em um servidor estático local. Se estiver usando VS Code, a extensão Live Server é uma boa opção.

Inicie um servidor estático na raiz do projeto e acesse a página inicial:

```text
http://localhost:5500/index.html
```

## Estrutura de dados no Firestore
O sistema utiliza, principalmente, as coleções:
- usuarios: dados cadastrais dos usuários
- produtos: catálogo de produtos disponíveis para venda

## Observações importantes
- A aplicação depende de uma conexão funcional com o Firebase. A configuração do domínio autorizado no Firebase Console é necessária para autenticação no domínio publicado.
- Para fins acadêmicos, esta documentação pode ser adaptada para a apresentação do TCC com mais detalhes de arquitetura, fluxo de usuário e justificativa técnica.

## Sugestão de uso para o TCC
Esta documentação pode servir como base para a seção de implementação do trabalho, incluindo:
- descrição da proposta do sistema;
- arquitetura do projeto;
- fluxo de usuário;
- tecnologias empregadas;
- desafios encontrados e soluções implementadas.
