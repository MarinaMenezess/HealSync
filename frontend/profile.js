const API_URL = 'http://localhost:3000'; // URL base definida no backend/server.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o listener para a solicitação de perfil de psicólogo
    const requestButton = document.getElementById('btn-request-psychologist');
    if (requestButton) {
        requestButton.addEventListener('click', handlePsychologistRequest);
    }
    
    // NOVO: Inicializa o listener para o botão de toggle
    const toggleButton = document.getElementById('btn-toggle-psychologist-request');
    if (toggleButton) {
        toggleButton.addEventListener('click', togglePsychologistRequestForm);
    }
    
    // 2. Adiciona listener para o botão de Logout (Exemplo)
    const logoutButton = document.querySelector('.logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // 3. (Opcional) Tenta carregar os dados do perfil ao carregar a página
    loadUserProfile();
});

function handleLogout() {
    localStorage.removeItem('jwt'); // Remove o token
    localStorage.removeItem('user'); // Remove os dados do usuário, se houver
    window.location.href = 'login.html'; // Redireciona para a página de login
}

/**
 * NOVO: Função para alternar a visibilidade do formulário de solicitação.
 */
function togglePsychologistRequestForm() {
    const formContainer = document.getElementById('psychologist-form-container');
    const toggleButton = document.getElementById('btn-toggle-psychologist-request');
    
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        formContainer.style.display = 'block';
        toggleButton.textContent = 'Ocultar Formulário de Solicitação';
    } else {
        formContainer.style.display = 'none';
        toggleButton.textContent = 'Sou profissional de saúde mental? Clique aqui para solicitar';
    }
}

/**
 * Função mock para carregar dados do usuário (em um projeto real, 
 * esta função chamaria um endpoint GET /profile)
 */
function loadUserProfile() {
    const userJson = localStorage.getItem('user');
    const token = localStorage.getItem('jwt');
    const profileNameElement = document.querySelector('.profile-name');
    const profileEmailElement = document.querySelector('.profile-email');

    if (!token) {
        // Redireciona se não estiver logado
        window.location.href = 'login.html';
        return;
    }
    
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            // Atualiza o nome e o email no cartão de perfil
            if (profileNameElement) profileNameElement.textContent = user.nome || 'Usuário Desconhecido';
            if (profileEmailElement) profileEmailElement.textContent = user.email || 'email@desconhecido.com';

            // Esconde o botão de solicitação de psicólogo se o usuário já for um psicólogo
            if (user.is_psicologo) {
                const requestSection = document.getElementById('psychologist-request-section');
                if (requestSection) {
                    requestSection.innerHTML = '<h2>Perfil de Psicólogo Ativo</h2><p>Seu perfil de psicólogo está ativo. Você pode editar seus dados de especialidade através do botão "Editar Perfil".</p>';
                }
            }
        } catch (e) {
            console.error('Erro ao analisar os dados do usuário no localStorage:', e);
            // Poderia forçar um logout aqui por segurança
        }
    }
}

/**
 * Função responsável por enviar a solicitação de alteração de perfil para psicólogo
 */
function handlePsychologistRequest() {
    const token = localStorage.getItem('jwt');
    const especialidadeInput = document.getElementById('especialidade-input');
    const contatoInput = document.getElementById('contato-input');
    const statusMessage = document.getElementById('psychologist-request-status');
    
    // Limpa a mensagem de status anterior
    statusMessage.textContent = '';
    statusMessage.style.color = 'green';
    
    if (!token) {
        statusMessage.textContent = 'Token de autenticação não encontrado. Por favor, faça login novamente.';
        statusMessage.style.color = 'red';
        return;
    }

    const especialidade = especialidadeInput ? especialidadeInput.value.trim() : '';
    const contato = contatoInput ? contatoInput.value.trim() : '';

    if (!especialidade || !contato) {
        statusMessage.textContent = 'Especialidade e Contato são obrigatórios para a solicitação.';
        statusMessage.style.color = 'red';
        return;
    }

    // Exibe mensagem de processamento
    statusMessage.textContent = 'Enviando solicitação para o administrador...';
    
    fetch(`${API_URL}/users/psychologist-details`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            // Usa o token de autenticação JWT local (necessário para o authMiddleware)
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ especialidade, contato })
    })
    .then(response => response.json().then(data => {
        if (!response.ok) {
            // Lógica para erros de backend (e.g., validação de campos)
            throw new Error(data.error || 'Erro desconhecido ao processar a solicitação.');
        }
        
        // Exibe a mensagem de sucesso retornada pelo backend
        statusMessage.textContent = data.mensagem;
        statusMessage.style.color = 'green';
        
        // Limpa os campos após o sucesso
        especialidadeInput.value = '';
        contatoInput.value = '';

    }))
    .catch(error => {
        // Trata erros de rede ou erros lançados acima
        statusMessage.textContent = `Falha na solicitação: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error('Erro na solicitação de perfil de psicólogo:', error);
    });
}