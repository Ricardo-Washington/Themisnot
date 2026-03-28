# TRABALHO DE CONCLUSÃO DE CURSO

**Título:** Desenvolvimento de um Sistema Web para Gestão de Cursos e Produtos em uma Escola de Segurança: Caso Thémis

**Autor:** [Seu Nome Completo]

**Orientador:** [Nome do Orientador]

**Instituição:** [Nome da Instituição de Ensino]

**Curso:** [Nome do Curso, ex: Sistemas de Informação]

**Data:** [Data de Entrega]

---

## RESUMO

Este trabalho apresenta o desenvolvimento de um sistema web para a escola de segurança Thémis, focado na gestão de cursos e vendas de produtos de segurança. O sistema foi implementado utilizando tecnologias web modernas, incluindo HTML, CSS, JavaScript, Firebase para autenticação e banco de dados, e localStorage para gerenciamento de carrinho de compras. A plataforma permite aos usuários se cadastrarem, acessarem cursos, adquirir produtos e realizar pagamentos via PIX. O objetivo é fornecer uma solução digital para otimizar os processos educacionais e comerciais da instituição, promovendo acessibilidade e eficiência.

**Palavras-chave:** Sistema web, segurança, cursos online, e-commerce, Firebase.

---

## ABSTRACT

This work presents the development of a web system for the security school Thémis, focused on course management and sales of security products. The system was implemented using modern web technologies, including HTML, CSS, JavaScript, Firebase for authentication and database, and localStorage for shopping cart management. The platform allows users to register, access courses, purchase products, and make payments via PIX. The goal is to provide a digital solution to optimize the educational and commercial processes of the institution, promoting accessibility and efficiency.

**Keywords:** Web system, security, online courses, e-commerce, Firebase.

---

## SUMÁRIO

1. INTRODUÇÃO  
   1.1. Contextualização  
   1.2. Problema de Pesquisa  
   1.3. Objetivos  
   1.4. Justificativa  
   1.5. Estrutura do Trabalho  

2. REVISÃO DE LITERATURA  
   2.1. Tecnologias Web  
   2.2. Sistemas de Gestão Educacional  
   2.3. E-commerce e Segurança de Pagamentos  
   2.4. Firebase como Plataforma Backend  

3. METODOLOGIA  
   3.1. Tipo de Pesquisa  
   3.2. Metodologia de Desenvolvimento  
   3.3. Ferramentas e Tecnologias Utilizadas  
   3.4. Processo de Desenvolvimento  

4. DESENVOLVIMENTO DO SISTEMA  
   4.1. Análise de Requisitos  
   4.2. Design e Arquitetura  
   4.3. Implementação  
   4.4. Funcionalidades Principais  

5. RESULTADOS E DISCUSSÃO  
   5.1. Testes e Validação  
   5.2. Desafios Encontrados  
   5.3. Limitações  

6. CONCLUSÃO  
   6.1. Considerações Finais  
   6.2. Trabalhos Futuros  

REFERÊNCIAS  

APÊNDICES  

---

## 1. INTRODUÇÃO

### 1.1. Contextualização

A educação em segurança é fundamental para a formação de profissionais capacitados a atuar em diversos setores, como vigilância, escolta e gestão de riscos. Com o avanço da tecnologia, as instituições educacionais têm migrado para plataformas digitais para oferecer cursos e serviços de forma mais acessível. A escola Thémis, especializada em treinamentos de segurança, necessita de um sistema web que integre gestão de cursos e vendas de produtos, facilitando o acesso aos alunos e otimizando os processos administrativos.

### 1.2. Problema de Pesquisa

Como desenvolver um sistema web integrado que permita a gestão de cursos e a comercialização de produtos de segurança, utilizando tecnologias modernas e garantindo segurança e usabilidade?

### 1.3. Objetivos

**Objetivo Geral:** Desenvolver um sistema web para a escola Thémis que integre funcionalidades de gestão educacional e e-commerce.

**Objetivos Específicos:**
- Implementar autenticação e cadastro de usuários.
- Criar páginas para exibição de cursos e produtos.
- Desenvolver um carrinho de compras com checkout via PIX.
- Garantir responsividade e acessibilidade.

### 1.4. Justificativa

A digitalização dos processos educacionais e comerciais é essencial para competir no mercado atual. Este sistema visa atender às necessidades da Thémis, proporcionando uma experiência aprimorada aos usuários e facilitando a gestão interna.

### 1.5. Estrutura do Trabalho

O trabalho está organizado em seis capítulos: Introdução, Revisão de Literatura, Metodologia, Desenvolvimento, Resultados e Conclusão, seguidos de Referências e Apêndices.

---

## 2. REVISÃO DE LITERATURA

### 2.1. Tecnologias Web

As tecnologias web como HTML, CSS e JavaScript formam a base para o desenvolvimento de aplicações front-end. Frameworks como Firebase oferecem soluções backend-as-a-service, simplificando a implementação de autenticação e bancos de dados (Firebase Documentation, 2023).

### 2.2. Sistemas de Gestão Educacional

Sistemas LMS (Learning Management Systems) como Moodle e Canvas são exemplos de plataformas que integram cursos online. Este trabalho adapta conceitos similares para o contexto de segurança (Wiley, 2000).

### 2.3. E-commerce e Segurança de Pagamentos

O e-commerce requer mecanismos seguros de pagamento. O PIX, sistema brasileiro, oferece transações rápidas e seguras (Banco Central do Brasil, 2020).

### 2.4. Firebase como Plataforma Backend

Firebase fornece autenticação, Firestore para banco de dados e hospedagem, ideal para aplicações web escaláveis (Google, 2023).

---

## 3. METODOLOGIA

### 3.1. Tipo de Pesquisa

Pesquisa aplicada, com desenvolvimento de software.

### 3.2. Metodologia de Desenvolvimento

Utilizou-se a metodologia ágil Scrum, com iterações para implementação de funcionalidades.

### 3.3. Ferramentas e Tecnologias Utilizadas

- Front-end: HTML, CSS, JavaScript.
- Backend: Firebase (Auth, Firestore).
- Controle de versão: Git.
- Editor: VS Code.

### 3.4. Processo de Desenvolvimento

1. Planejamento e análise de requisitos.
2. Design de interfaces.
3. Implementação incremental.
4. Testes e validação.

---

## 4. DESENVOLVIMENTO DO SISTEMA

### 4.1. Análise de Requisitos

Requisitos funcionais incluem cadastro de usuários, exibição de produtos/cursos, carrinho de compras e checkout. Requisitos não funcionais: responsividade, segurança.

### 4.2. Design e Arquitetura

Arquitetura cliente-servidor, com Firebase como backend. Estrutura de pastas organizada por funcionalidades.

### 4.3. Implementação

- **Páginas:** Home, Produtos, Carrinho, Login.
- **Funcionalidades:** Autenticação via Firebase, armazenamento local para carrinho, modal de checkout com QR Code PIX.
- **Estilos:** CSS responsivo com variáveis para consistência.

### 4.4. Funcionalidades Principais

- Cadastro e login de usuários.
- Adição de produtos ao carrinho.
- Finalização de compra com geração de QR Code.
- Retirada de produtos na academia.

---

## 5. RESULTADOS E DISCUSSÃO

### 5.1. Testes e Validação

Testes manuais confirmaram o funcionamento das funcionalidades principais. Usuários puderam navegar, adicionar itens e simular pagamentos.

### 5.2. Desafios Encontrados

Integração com Firebase e geração de QR Code foram os principais desafios, resolvidos com documentação e bibliotecas.

### 5.3. Limitações

Sistema simulado; para produção, integrar APIs reais de pagamento.

---

## 6. CONCLUSÃO

### 6.1. Considerações Finais

O sistema desenvolvido atende aos objetivos, proporcionando uma plataforma funcional para a Thémis.

### 6.2. Trabalhos Futuros

Implementar notificações push, integração com gateways de pagamento e análise de dados de usuários.

---

## REFERÊNCIAS

- Banco Central do Brasil. (2020). *PIX: O novo meio de pagamento instantâneo*. Recuperado de [link].
- Firebase Documentation. (2023). *Firebase Web SDK*. Google.
- Google. (2023). *Firebase Overview*. Recuperado de [link].
- Wiley, D. A. (2000). *Learning Object Design and Sequencing Theory*. IEEE.

---

## APÊNDICES

**Apêndice A: Código Fonte**  
(Incluir trechos relevantes do código, como funções JavaScript e estruturas HTML.)

**Apêndice B: Screenshots do Sistema**  
(Descrições de telas: Home, Produtos, Carrinho, Checkout.)