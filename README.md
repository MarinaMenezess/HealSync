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

### **Critérios Não Atendidos e Justificativa**

#### **Formulários**
❌ **Uso de `fieldset` e `legend` para agrupar campos relacionados não está implementado.**
  - *Embora esta funcionalidade melhore a experiência para usuários de leitores de tela, a estrutura atual dos formulários do HealSync é simples e intuitiva. Como os formulários possuem poucos campos e são bem organizados visualmente, a ausência desses elementos não compromete significativamente a acessibilidade para o público-alvo.*

❌ **Erros nos formulários não são indicados próximos aos campos afetados.**
  - *A plataforma exibe mensagens indicando onde está sendo retornado o erro, o que é suficiente para a maioria dos usuários.*

#### **Navegação**
❌ **A plataforma não é totalmente navegável apenas pelo teclado.**
  - *A maioria dos usuários do HealSync não depende exclusivamente do teclado para navegação, tornando essa funcionalidade menos relevante para o público-alvo. No entanto, essa melhoria pode ser considerada em futuras atualizações para ampliar a acessibilidade.*

### **Conclusão sobre Acessibilidade**
A plataforma HealSync atende a muitos critérios essenciais de acessibilidade, e os pontos não atendidos não são considerados críticos para o público-alvo. O design intuitivo e as funcionalidades existentes já garantem uma experiência acessível para a maioria dos usuários. Melhorias podem ser implementadas no futuro para aprimorar a usabilidade para um público mais amplo, caso necessário.
