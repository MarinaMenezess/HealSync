# HealSync

[cite\_start]**HealSync** é uma plataforma digital inovadora desenvolvida para auxiliar **adultos que sofreram traumas na infância**, oferecendo suporte emocional, recursos terapêuticos, acompanhamento do progresso e acesso a profissionais de saúde mental[cite: 34]. [cite\_start]A aplicação também visa educar familiares sobre a prevenção de traumas infantis e promover uma comunidade interativa de apoio mútuo[cite: 70].

-----

## 🎯 Objetivo

O HealSync foi criado com os seguintes objetivos:

  - [cite\_start]💬 Proporcionar suporte emocional e educacional para adultos com traumas de infância[cite: 34].
  - [cite\_start]🤝 Criar uma comunidade interativa para compartilhamento de experiências e apoio mútuo[cite: 72].
  - [cite\_start]📚 Disponibilizar conteúdos educativos e informativos que abordam as causas, sintomas e formas de tratamento dos traumas de infância[cite: 75].
  - [cite\_start]📈 Permitir o registro e acompanhamento do progresso emocional dos usuários[cite: 23].
  - [cite\_start]👩‍⚕️ Facilitar o agendamento de consultas com profissionais de saúde mental[cite: 23].

-----

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias e Ferramentas |
|---|---|
| **Frontend** | [cite\_start]HTML5, CSS3, JavaScript puro [cite: 26, 39, 306] |
| **Backend** | [cite\_start]Node.js e Express [cite: 26, 39, 306, 355] |
| **Banco de Dados** | [cite\_start]MySQL [cite: 26, 39, 362] |
| **Arquitetura** | [cite\_start]Microserviços e em três camadas (3-tier) [cite: 26, 39, 326] |
| **Autenticação** | [cite\_start]OAuth 2.0 (com suporte a login via Google) [cite: 27, 39] |
| **Segurança** | [cite\_start]Criptografia de dados, autenticação multifator (MFA), JSON Web Tokens (JWT) [cite: 27, 39, 309] |
| **Notificações** | [cite\_start]Integração com API do WhatsApp [cite: 411, 608] |
| **Infraestrutura** | [cite\_start]Amazon Web Services (AWS) e Vercel [cite: 370] |

-----

## ✨ Funcionalidades

### 🔐 1. Gestão de Usuários e Autenticação

  - [cite\_start]Permite o cadastro e login de novos usuários, com distinção entre pacientes e psicólogos[cite: 399, 400].
  - [cite\_start]Edição de perfil e exclusão de conta[cite: 403, 404].
  - [cite\_start]A autenticação é feita por meio de JSON Web Tokens (JWT)[cite: 304, 450].

### 📅 2. Gestão de Consultas

  - [cite\_start]Permite que um paciente agende uma consulta com um psicólogo[cite: 406].
  - [cite\_start]Possibilita o cancelamento da consulta pelo paciente e a confirmação pelo psicólogo[cite: 407, 408].
  - [cite\_start]O sistema registra a data, hora e status da consulta[cite: 410].
  - [cite\_start]O backend aciona o serviço de notificação do WhatsApp para enviar lembretes[cite: 411].

### ✍️ 3. Registro e Acompanhamento do Progresso

  - [cite\_start]O paciente pode criar, editar e excluir registros de progresso, que incluem emoção, descrição e data[cite: 413, 415, 416].
  - [cite\_start]O paciente pode optar por publicar um registro para que seja visível para a comunidade[cite: 417].

### 🤝 4. Interação Social

  - [cite\_start]Usuários podem comentar e curtir em registros de progresso publicados por outros[cite: 23, 419, 426].
  - [cite\_start]O sistema permite a edição e exclusão de comentários[cite: 421, 424].
  - [cite\_start]Também é possível remover uma curtida[cite: 427].

### 💬 5. Interação com a IA

  - [cite\_start]Usuários podem iniciar e finalizar uma conversa com a inteligência artificial da plataforma[cite: 437, 443].
  - [cite\_start]Permite o envio, edição e exclusão de mensagens na conversa[cite: 441, 442].

### 📝 6. Anotações de Psicólogo

  - [cite\_start]Psicólogos podem criar, editar e excluir anotações clínicas privadas sobre um paciente[cite: 429, 432, 433].
  - [cite\_start]O backend garante que apenas o psicólogo autor e o paciente relacionado possam visualizar a anotação[cite: 434].

-----

## ♿ Acessibilidade

[cite\_start]A plataforma foi desenvolvida para ter uma interface intuitiva, fácil de usar e responsiva[cite: 454]. [cite\_start]O design segue princípios de design centrado no usuário, com navegação clara e elementos visuais que criam um ambiente acolhedor[cite: 343]. [cite\_start]A compatibilidade com os principais navegadores em diferentes dispositivos (desktop e mobile) garante amplo acesso[cite: 468].

-----

## 🚀 Como Executar o Projeto

### Pré-requisitos

  - [cite\_start]Node.js [cite: 355]
  - [cite\_start]MySQL [cite: 362]
  - NPM ou Yarn

### Instalação

1.  Clone o repositório:

<!-- end list -->

```bash
git clone https://github.com/seu-usuario/healsync.git
cd healsync
```
