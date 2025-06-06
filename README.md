# HealSync

**HealSync** é uma plataforma digital inovadora desenvolvida para auxiliar **adultos que sofreram traumas na infância**, oferecendo suporte emocional, recursos terapêuticos, acompanhamento do progresso e acesso a profissionais de saúde mental. A aplicação também visa educar familiares sobre a prevenção de traumas infantis e promover uma comunidade interativa de apoio mútuo.

---

## 🎯 Objetivo

O HealSync foi criado com os seguintes objetivos:

- 💬 Proporcionar suporte emocional e educacional para adultos com traumas de infância.
- 🤝 Criar uma comunidade interativa para compartilhamento de experiências.
- 📚 Disponibilizar conteúdos educativos sobre traumas e tratamentos recomendados.
- 📈 Permitir o registro e acompanhamento do progresso emocional dos usuários.
- 👩‍⚕️ Facilitar o agendamento de consultas com profissionais de saúde mental.

---

## 🛠️ Tecnologias Utilizadas

| Camada       | Tecnologias e Ferramentas                             |
|--------------|--------------------------------------------------------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, JavaScript                  |
| **Backend**  | Node.js                                               |
| **Banco de Dados** | MySQL                                          |
| **Autenticação** | OAuth 2.0 (com suporte a login via Google)       |
| **Segurança** | Criptografia AES-256                                 |
| **Infraestrutura** | Amazon Web Services (AWS) com Elastic Beanstalk |

---

## ✨ Funcionalidades

### 🔐 1. Cadastro e Login
- Registro de usuários com validação segura.
- Login tradicional e via conta Google.
- Recuperação de senha por e-mail.

### 👤 2. Perfil do Usuário
- Edição de dados pessoais.
- Histórico e gerenciamento de registros emocionais.

### 🕒 3. Linha do Tempo (Timeline)
- Compartilhamento de experiências.
- Curtidas e comentários entre usuários.

### 📘 4. Sistema de Registros
- Registro diário de emoções.
- Opção de tornar registros privados ou públicos.
- Gráficos de acompanhamento emocional.

### 💬 5. Chat entre Usuários
- Mensagens diretas e criação de grupos de apoio.

### 📅 6. Agendamento de Consultas
- Lista de psicólogos cadastrados.
- Integração com Google Agenda para marcação de sessões.

### 📚 7. Recursos Educacionais
- Artigos, vídeos e materiais sobre traumas e saúde mental.
- Técnicas de mindfulness e relaxamento.

### 🔒 8. Segurança e Privacidade
- Criptografia de dados sensíveis (AES-256).
- Autenticação multifator (MFA).
- Moderação de conteúdo e controle de privacidade pelo usuário.

---

## ♿ Acessibilidade

A plataforma HealSync foi construída com foco na experiência do usuário, sendo intuitiva e acessível para a maioria do público-alvo. No entanto, alguns pontos de melhoria foram identificados:

### ❌ Critérios Não Atendidos
- **Uso de `fieldset` e `legend`** em formulários.
- **Indicação de erros próxima aos campos afetados.**
- **Navegação completa apenas pelo teclado.**

### ✅ Justificativa
- Os formulários são curtos e bem organizados visualmente.
- Mensagens de erro são claras, mesmo não estando ao lado dos campos.
- A maioria dos usuários da plataforma não depende exclusivamente do teclado.

> Melhorias futuras poderão incluir essas adequações para ampliar ainda mais a acessibilidade.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js
- MySQL
- NPM ou Yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/healsync.git
cd healsync
