# HealSync

**HealSync** é uma plataforma digital inovadora desenvolvida para auxiliar **adultos que sofreram traumas na infância**, oferecendo suporte emocional, recursos terapêuticos, acompanhamento do progresso e acesso a profissionais de saúde mental [34].  
A aplicação também visa educar familiares sobre a prevenção de traumas infantis e promover uma comunidade interativa de apoio mútuo [70].

-----

## 🎯 Objetivo

O HealSync foi criado com os seguintes objetivos:

- 💬 Proporcionar suporte emocional e educacional para adultos com traumas de infância [34].  
- 🤝 Criar uma comunidade interativa para compartilhamento de experiências e apoio mútuo [72].  
- 📚 Disponibilizar conteúdos educativos e informativos que abordam as causas, sintomas e formas de tratamento dos traumas de infância [75].  
- 📈 Permitir o registro e acompanhamento do progresso emocional dos usuários [23].  
- 👩‍⚕️ Facilitar o agendamento de consultas com profissionais de saúde mental [23].

-----

## 🛠️ Tecnologias Utilizadas

| Camada            | Tecnologias e Ferramentas |
|-------------------|---------------------------|
| **Frontend**       | HTML5, CSS3, JavaScript puro [26, 39, 306] |
| **Backend**        | Node.js e Express [26, 39, 306, 355] |
| **Banco de Dados** | MySQL [26, 39, 362] |
| **Arquitetura**    | Microserviços e em três camadas (3-tier) [26, 39, 326] |
| **Autenticação**   | OAuth 2.0 (com suporte a login via Google) [27, 39] |
| **Segurança**      | Criptografia de dados, autenticação multifator (MFA), JSON Web Tokens (JWT) [27, 39, 309] |
| **Notificações**   | Integração com API do WhatsApp [411, 608] |
| **Infraestrutura** | Amazon Web Services (AWS) e Vercel [370] |

-----

## ✨ Funcionalidades

### 🔐 1. Gestão de Usuários e Autenticação

- Permite o cadastro e login de novos usuários, com distinção entre pacientes e psicólogos [399, 400].  
- Edição de perfil e exclusão de conta [403, 404].  
- A autenticação é feita por meio de JSON Web Tokens (JWT) [304, 450].

### 📅 2. Gestão de Consultas

- Permite que um paciente agende uma consulta com um psicólogo [406].  
- Possibilita o cancelamento da consulta pelo paciente e a confirmação pelo psicólogo [407, 408].  
- O sistema registra a data, hora e status da consulta [410].  
- O backend aciona o serviço de notificação do WhatsApp para enviar lembretes [411].

### ✍️ 3. Registro e Acompanhamento do Progresso

- O paciente pode criar, editar e excluir registros de progresso, que incluem emoção, descrição e data [413, 415, 416].  
- O paciente pode optar por publicar um registro para que seja visível para a comunidade [417].

### 🤝 4. Interação Social

- Usuários podem comentar e curtir em registros de progresso publicados por outros [23, 419, 426].  
- O sistema permite a edição e exclusão de comentários [421, 424].  
- Também é possível remover uma curtida [427].

### 💬 5. Interação com a IA

- Usuários podem iniciar e finalizar uma conversa com a inteligência artificial da plataforma [437, 443].  
- Permite o envio, edição e exclusão de mensagens na conversa [441, 442].

### 📝 6. Anotações de Psicólogo

- Psicólogos podem criar, editar e excluir anotações clínicas privadas sobre um paciente [429, 432, 433].  
- O backend garante que apenas o psicólogo autor e o paciente relacionado possam visualizar a anotação [434].

-----

## ♿ Acessibilidade

A plataforma foi desenvolvida para ter uma interface intuitiva, fácil de usar e responsiva [454].  
O design segue princípios de design centrado no usuário, com navegação clara e elementos visuais que criam um ambiente acolhedor [343].  
A compatibilidade com os principais navegadores em diferentes dispositivos (desktop e mobile) garante amplo acesso [468].

-----

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js [355]  
- MySQL [362]  
- NPM ou Yarn

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/healsync.git
cd healsync
