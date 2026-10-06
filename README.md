# Thémis

Sistema web desenvolvido como parte de um projeto de TCC, com foco em uma plataforma de vendas e capacitação para o segmento de segurança privada, vigilância e cursos profissionalizantes.

## Visão geral
O projeto reúne um front-end em HTML, CSS e JavaScript com autenticação e armazenamento de dados em Firebase, além de um backend em Python/Flask para integração com o Mercado Pago. A aplicação permite:

- cadastro e login de usuários;
- visualização de produtos e cursos;
- carrinho de compras;
- checkout com pagamento via Mercado Pago;
- cadastro de dados complementares dos usuários;
- diferenciação de acessos para clientes, funcionários e administradores.

## Tecnologias utilizadas
- Front-end: HTML, CSS, JavaScript
- Autenticação e banco de dados: Firebase Auth + Firestore
- Backend de pagamento: Python + Flask + Mercado Pago
- Servidor local para testes: Live Server, Python HTTP Server ou qualquer servidor estático

## Estrutura do projeto
- [home](home): páginas iniciais e navegação principal
- [products](products): catálogo de produtos e integração com o carrinho
- [cart](cart): carrinho, checkout e integração com o backend de pagamento
- [login](login), [registerEmployee](registerEmployee) e [Registrice](Registrice): fluxos de autenticação e cadastro
- [js](js): configuração compartilhada do Firebase e scripts de apoio
- [cursos](cursos): páginas de cursos e capacitações
- [meuPerfil](meuPerfil): área do usuário para visualização e atualização de dados

## Funcionalidades principais
### Autenticação
O login é realizado com e-mail e senha pelo Firebase Authentication. Após o login, o sistema verifica a atribuição do usuário no Firestore e redireciona para a área correta.

### Cadastro de usuário
Ao fazer o primeiro acesso, o sistema pode abrir um modal para completar os dados cadastrais, como nome, CPF, RG, telefone, endereço e atribuição.

### Catálogo de produtos
Os produtos são carregados dinamicamente a partir da coleção produtos do Firestore.

### Carrinho e pagamento
Os itens adicionados ao carrinho são armazenados no localStorage. A integração atual com o Mercado Pago usa uma API local em Flask apenas para desenvolvimento e testes. **Não use o fluxo atual para receber pagamentos reais nem o publique em produção**: o backend ainda precisa de autenticação, consulta de preços confiáveis no servidor, persistência de pedidos e confirmação de pagamento por webhook verificado.

## Como executar localmente
### 1. Pré-requisitos
- Node.js e um servidor estático local (opcional, mas recomendado)
- Python 3
- Conta Firebase configurada
- Conta Mercado Pago com access token

### 2. Configurar o Firebase
As configurações do Firebase já estão presentes nos arquivos de JavaScript do projeto. Para uso em outro ambiente, substitua os valores de configuração pelos dados do seu projeto Firebase.

### 3. Rodar o front-end
Você pode abrir o projeto em um servidor estático local. Se estiver usando VS Code, a extensão Live Server é uma boa opção.

Exemplo simples com Python:

```bash
python -m http.server 8000
```

Depois, acesse:

```text
http://localhost:8000/index/index.html
```

### 4. Rodar o backend de pagamento
Para testes locais do checkout, configure as variáveis listadas em `.env.example` e instale as dependências do Python:

```bash
pip install flask flask-cors mercadopago
```

Em seguida, inicie o servidor:

```bash
python cart/apimercadopago.py
```

O backend ficará disponível localmente em:

```text
http://127.0.0.1:5000
```

## Estrutura de dados no Firestore
O sistema utiliza, principalmente, as coleções:
- usuarios: dados cadastrais dos usuários
- produtos: catálogo de produtos disponíveis para venda

## Observações importantes
- O checkout é somente para desenvolvimento/testes e não está pronto para produção; alterar apenas as URLs de retorno não é suficiente para torná-lo seguro.
- Nunca versione segredos, como o token de acesso do Mercado Pago. Use variáveis de ambiente ou um gerenciador de segredos no servidor.
- O projeto depende de uma conexão funcional com o Firebase e do servidor Flask local para testar o fluxo de pagamento.
- Para fins acadêmicos, esta documentação pode ser adaptada para a apresentação do TCC com mais detalhes de arquitetura, fluxo de usuário e justificativa técnica.

## Sugestão de uso para o TCC
Esta documentação pode servir como base para a seção de implementação do trabalho, incluindo:
- descrição da proposta do sistema;
- arquitetura do projeto;
- fluxo de usuário;
- tecnologias empregadas;
- integração com APIs externas;
- desafios encontrados e soluções implementadas.
