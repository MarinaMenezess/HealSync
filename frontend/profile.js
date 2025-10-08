const API_URL = 'http://localhost:3000'; // URL base definida no backend/server.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o listener para a solicitação de perfil de psicólogo
    const requestButton = document.getElementById('btn-request-psychologist');
    if (requestButton) {
        requestButton.addEventListener('click', handlePsychologistRequest);
    }
    
    // Inicializa o listener para o botão de toggle da solicitação de psicólogo
    const toggleButton = document.getElementById('btn-toggle-psychologist-request');
    if (toggleButton) {
        toggleButton.addEventListener('click', togglePsychologistRequestForm);
    }
    
    // 2. Adiciona listener para o botão de Logout 
    const logoutButton = document.querySelector('.logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Adiciona listener para o botão de Editar Perfil
    const editButton = document.querySelector('.edit-btn');
    if (editButton) {
        editButton.addEventListener('click', handleEditProfile);
    }
    
    // NOVO: Adiciona listener para o botão Cancelar (dentro do formulário de edição)
    const cancelButton = document.querySelector('.cancel-edit-btn');
    if (cancelButton) {
        // Alterna o modo de edição para fechar sem salvar
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            toggleEditMode(false);
        });
    }
    
    // NOVO: Adiciona listener para o envio do formulário (Para salvar os dados)
    const editForm = document.getElementById('profile-edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleSaveProfile);
    }

    // 3. Tenta carregar os dados do perfil ao carregar a página
    loadUserProfile();
});

function handleLogout() {
    localStorage.removeItem('jwt'); // Remove o token
    localStorage.removeItem('user'); // Remove os dados do usuário, se houver
    localStorage.removeItem('token'); // Remove a chave antiga para limpeza
    window.location.href = 'login.html'; // Redireciona para a página de login
}

/**
 * Função utilitária para alternar entre o modo de visualização e edição (incluindo botões).
 * Garante que a seção de edição substitua a de visualização no mesmo local.
 * @param {boolean|null} shouldShowEdit - true para mostrar edição, false para mostrar visualização, null para alternar.
 */
function toggleEditMode(shouldShowEdit = null) {
    // Conteúdo Principal: Visualização vs. Formulário
    const viewDiv = document.getElementById('profile-view');
    const editFormDiv = document.getElementById('profile-edit-form');
    
    // Botões de Ação: Editar/Sair vs. Salvar/Cancelar
    const viewButtons = document.getElementById('profile-actions-view');
    const editButtons = document.getElementById('profile-actions-edit');

    if (!viewDiv || !editFormDiv || !viewButtons || !editButtons) {
        console.error("Elementos necessários para o toggle de edição não encontrados no DOM.");
        return;
    }
    
    // Lógica para decidir se deve mostrar o modo de edição
    const isEditModeActive = shouldShowEdit === true || (shouldShowEdit === null && editFormDiv.style.display === 'none');

    if (isEditModeActive) {
        // MODO DE EDIÇÃO ATIVO
        viewDiv.style.display = 'none';
        editFormDiv.style.display = 'block';
        
        viewButtons.style.display = 'none';
        editButtons.style.display = 'flex'; // Exibe botões Salvar/Cancelar
    } else {
        // MODO DE VISUALIZAÇÃO ATIVO
        viewDiv.style.display = 'block';
        editFormDiv.style.display = 'none';
        
        viewButtons.style.display = 'flex'; // Exibe botões Editar/Sair
        editButtons.style.display = 'none';
    }
}


/**
 * Função para manipular o clique no botão Editar Perfil.
 * Pré-preenche o formulário e exibe o modo de edição.
 */
function handleEditProfile() {
    // 1. Alterna para o modo de Edição (exibe o formulário)
    toggleEditMode(true);
    
    // 2. Pré-preenche os campos do formulário
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Pré-preenche campos básicos
            const editNameInput = document.getElementById('edit-name');
            const editEmailInput = document.getElementById('edit-email');
            
            if (editNameInput) editNameInput.value = user.nome || '';
            if (editEmailInput) editEmailInput.value = user.email || '';
            
            // Pré-preenche campos da grid de informações (Assumindo que estão no objeto user)
            const editPhoneInput = document.getElementById('edit-phone');
            const editDobInput = document.getElementById('edit-dob');
            const editGenderInput = document.getElementById('edit-gender');
            const editCityInput = document.getElementById('edit-city');

            if (editPhoneInput) editPhoneInput.value = user.telefone || '';
            if (editDobInput) editDobInput.value = user.data_nascimento || ''; 
            if (editGenderInput) editGenderInput.value = user.genero || 'Prefiro não dizer';
            if (editCityInput) editCityInput.value = user.cidade || '';
            
        } catch (e) {
            console.error('Erro ao analisar os dados do usuário para edição:', e);
            alert('Não foi possível carregar os dados para edição.');
        }
    }
}

/**
 * Função para salvar as alterações do perfil (PUT request).
 */
async function handleSaveProfile(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('jwt');
    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    
    // Coletando dados da grid de edição
    const phone = document.getElementById('edit-phone') ? document.getElementById('edit-phone').value.trim() : null;
    const dob = document.getElementById('edit-dob') ? document.getElementById('edit-dob').value.trim() : null;
    const gender = document.getElementById('edit-gender') ? document.getElementById('edit-gender').value.trim() : null;
    const city = document.getElementById('edit-city') ? document.getElementById('edit-city').value.trim() : null;
    
    if (!token) {
        alert('Você não está autenticado. Faça login novamente.');
        return;
    }

    if (!name || !email) {
        alert('Nome e Email são campos obrigatórios.');
        return;
    }
    
    // Objeto com os dados a serem enviados para o backend
    const updatedData = {
        nome: name,
        email: email,
        telefone: phone,
        data_nascimento: dob,
        genero: gender,
        cidade: city,
    };
    
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        if (response.ok) {
            // ATUALIZA O localStorage com os novos dados
            localStorage.setItem('user', JSON.stringify(result.user));
            
            // Recarrega o perfil na tela para exibir os novos dados
            loadUserProfile();
            
            // Volta para o modo de visualização
            toggleEditMode(false);
            
            alert('Perfil atualizado com sucesso!');
        } else {
            alert('Falha ao salvar o perfil: ' + (result.error || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error('Erro de rede ao salvar perfil:', error);
        alert('Erro de conexão ou servidor ao salvar perfil.');
    }
}


/**
 * Função para alternar a visibilidade do formulário de solicitação de psicólogo.
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
 * Função responsável por carregar os dados do usuário e atualizar a interface.
 */
function loadUserProfile() {
    const userJson = localStorage.getItem('user');
    const token = localStorage.getItem('jwt');
    
    // Elementos de Visualização Básica
    const profileNameElement = document.querySelector('.profile-name');
    const profileEmailElement = document.querySelector('.profile-email');

    // Elementos de Visualização da Grid
    const viewPhoneElement = document.getElementById('view-phone');
    const viewDobElement = document.getElementById('view-dob');
    const viewGenderElement = document.getElementById('view-gender');
    const viewCityElement = document.getElementById('view-city');

    if (!token) {
        // Redireciona se não estiver logado
        window.location.href = 'login.html';
        return;
    }
    
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Atualiza campos básicos
            if (profileNameElement) profileNameElement.textContent = user.nome || 'Usuário Desconhecido';
            if (profileEmailElement) profileEmailElement.textContent = user.email || 'email@desconhecido.com';

            // Atualiza campos da grid com valores do usuário ou placeholders
            if (viewPhoneElement) viewPhoneElement.textContent = user.telefone || '(XX) XXXXX-XXXX';
            if (viewDobElement) viewDobElement.textContent = user.data_nascimento || 'DD/MM/AAAA';
            if (viewGenderElement) viewGenderElement.textContent = user.genero || 'Prefiro não dizer';
            if (viewCityElement) viewCityElement.textContent = user.cidade || 'Minha Cidade';

            // Esconde o botão de solicitação de psicólogo se o usuário já for um psicólogo
            if (user.is_psicologo) {
                const requestSection = document.getElementById('psychologist-request-section');
                if (requestSection) {
                    requestSection.innerHTML = '<h2>Perfil de Psicólogo Ativo</h2><p>Seu perfil de psicólogo está ativo. Você pode editar seus dados de especialidade através do botão "Editar Perfil".</p>';
                }
            }
        } catch (e) {
            console.error('Erro ao analisar os dados do usuário no localStorage:', e);
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