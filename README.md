# Documentação do Projeto HealSync

## Nome do Projeto
**HealSync**

## Objetivo
O **HealSync** é uma plataforma digital inovadora projetada para auxiliar adultos que sofreram traumas na infância, fornecendo suporte, informação e acompanhamento para o processo de tratamento. O sistema visa criar um ambiente seguro para que os usuários possam registrar suas emoções, compartilhar experiências e acessar recursos terapêuticos baseados em práticas recomendadas por especialistas. Além disso, a plataforma também se propõe a educar familiares sobre prevenção de traumas infantis e facilitar o acesso a profissionais de saúde mental.

Os principais objetivos do projeto incluem:
- Proporcionar suporte emocional e educacional para adultos que enfrentam traumas de infância.
- Criar uma comunidade interativa onde os usuários possam compartilhar experiências e se apoiar mutuamente.
- Disponibilizar recursos educativos sobre os impactos dos traumas e as melhores formas de tratamento.
- Oferecer funcionalidades que permitam o acompanhamento do progresso emocional dos usuários.
- Facilitar o acesso a profissionais de saúde mental por meio do agendamento de consultas.

## Tecnologias Utilizadas
O HealSync foi desenvolvido utilizando um conjunto moderno de tecnologias para garantir segurança, acessibilidade e eficiência:

- **Frontend:** HTML5, CSS3, Bootstrap 5 e JavaScript.
- **Backend:** Node.js para processamento e gestão de dados.
- **Banco de Dados:** MySQL para armazenar registros dos usuários.
- **Autenticação:** OAuth 2.0 para login seguro.
- **Segurança:** Criptografia AES-256 para proteger dados sensíveis.
- **Infraestrutura:** Deploy em nuvem utilizando Amazon Web Services (AWS).

## Funcionalidades Implementadas
O HealSync conta com diversas funcionalidades que auxiliam os usuários no acompanhamento da saúde mental e interação com a comunidade.

### 1. **Cadastro e Login**
- Registro seguro de usuários.
- Opção de login através do Google.
- Recuperação de senha via e-mail.

### 2. **Perfil do Usuário**
- Edição de informações pessoais.
- Visualização e gerenciamento de registros emocionais.

### 3. **Linha do Tempo (Timeline)**
- Compartilhamento de postagens e experiências.
- Interação com outros usuários por meio de curtidas e comentários.

### 4. **Sistema de Registros**
- Registro de emoções e experiências pessoais.
- Opção de manter registros privados ou compartilhá-los com a comunidade.
- Gráficos de acompanhamento do progresso emocional.

### 5. **Chat entre Usuários**
- Troca de mensagens diretas entre os usuários.
- Opção de criar grupos de apoio.

### 6. **Agendamento de Consultas**
- Acesso a uma lista de psicólogos cadastrados.
- Agendamento de sessões individuais.

### 7. **Recursos Educacionais**
- Artigos, vídeos e materiais informativos sobre traumas infantis e saúde mental.
- Práticas terapêuticas recomendadas, como mindfulness e técnicas de relaxamento.

### 8. **Segurança e Privacidade**
- Criptografia de dados sensíveis.
- Opções de controle de privacidade para os usuários.
- Monitoramento de conteúdo para garantir um ambiente seguro e respeitoso.

## Acessibilidade
A acessibilidade é um fator essencial no desenvolvimento do HealSync. Com base no checklist de acessibilidade, avaliamos os seguintes critérios:

### **Elementos Não Textuais**
✔ Todas as imagens possuem um atributo `alt` adequado.
✔ Não são utilizadas imagens contendo blocos de texto.
✔ Elementos visuais críticos possuem versões alternativas em texto.

### **Formulários**
✔ Todos os campos de formulário possuem rótulos (`label`).
❌ **Uso de `fieldset` e `legend` para agrupar campos relacionados não está implementado.**
✔ O envio de formulários é feito via `input/button`, sem depender exclusivamente de JavaScript.
❌ **Erros nos formulários não são indicados próximos aos campos afetados.**

### **Uso de Cor e Elementos Visuais**
✔ Informações importantes não são transmitidas apenas por cores.
✔ Não há elementos que piscam ou mudam de cor rapidamente para evitar gatilhos visuais.

### **Navegação**
✔ Existe um mecanismo para pular links repetitivos.
✔ O `<title>` de cada página é claro e descritivo.
❌ **A plataforma não é totalmente navegável apenas pelo teclado.**

### **Semântica e Legibilidade**
✔ O conteúdo está estruturado corretamente com `h1, h2, h3, p` e listas.
✔ O idioma da página é especificado no HTML (`lang="pt-BR"`).
✔ As tabelas utilizam `th` para indicar cabeçalhos.
✔ O site continua funcional com imagens desativadas.
✔ O site é navegável mesmo com CSS desativado.
✔ Aumentar o tamanho do texto em até 2x não prejudica a usabilidade.
