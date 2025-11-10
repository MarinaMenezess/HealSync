// ARQUIVO: frontend/profile.js (FINAL - Corrigido para 404 Graceful e Lógica de Edição)
const API_URL = 'http://localhost:3000'; 
const defaultAvatarUrl = '../assets/user-default.svg'; 

// --- Funções Auxiliares para UX ---
function showLoading(element) {
    if (!element) return;
    element.disabled = true;
    element.setAttribute('data-original-text', element.textContent);
    element.textContent = 'Aguarde...';
}

function hideLoading(element) {
    if (!element) return;
    element.disabled = false;
    element.textContent = element.getAttribute('data-original-text') || 'Salvar';
}

function getToken() {
    return localStorage.getItem('jwt');
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'N/A';
    const parts = dateString.substring(0, 10).split('-'); 
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    }
    return dateString;
}

// =========================================================================
// Lógica de Exibição do Menu de Opções da Foto
// =========================================================================

/**
 * Exibe/Oculta o menu de opções da foto.
 */
function togglePhotoOptionsMenu(e) {
    e.preventDefault();
    e.stopPropagation(); 
    
    const menu = document.getElementById('photo-options-menu');
    const optionChange = document.getElementById('option-change');
    const optionRemove = document.getElementById('option-remove');
    const profileAvatarEdit = document.getElementById('profile-avatar-edit');
    
    if (!menu || !profileAvatarEdit || !optionChange || !optionRemove) {
        return;
    }

    // Se estiver visível, esconde e sai
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        return;
    }

    // --- Abrir Menu ---
    
    // Verifica se a imagem exibida é a URL padrão
    const isDefaultAvatar = profileAvatarEdit.src.includes(defaultAvatarUrl);

    // 1. Ajusta o texto e a visibilidade das opções
    if (isDefaultAvatar) {
        optionChange.textContent = 'Adicionar Foto de Perfil';
        optionRemove.style.display = 'none'; // Esconde remover
    } else {
        optionChange.textContent = 'Alterar Foto de Perfil';
        optionRemove.style.display = 'block'; // Mostra remover
    }

    // 2. Posiciona e exibe o menu
    const rect = profileAvatarEdit.getBoundingClientRect();
    const parentRect = profileAvatarEdit.parentElement.getBoundingClientRect();

    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom - parentRect.top}px`;
    menu.style.left = `${rect.right - parentRect.left}px`;
    menu.style.transform = 'translate(-100%, 0)'; 
    menu.style.display = 'block';
}

/**
 * Esconde o menu de opções da foto ao clicar fora.
 */
function hidePhotoOptions(e) {
    const menu = document.getElementById('photo-options-menu');
    const profileAvatarEdit = document.getElementById('profile-avatar-edit');
    
    if (menu && menu.style.display === 'block' && e.target !== profileAvatarEdit && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
}
// =========================================================================


document.addEventListener('DOMContentLoaded', () => {
    // --- Referências de Elementos ---
    const profileEditForm = document.getElementById('profile-edit-form');
    const profilePictureFile = document.getElementById('profile-picture-file'); 
    const profileAvatarEdit = document.getElementById('profile-avatar-edit');
    const optionChange = document.getElementById('option-change');
    const optionRemove = document.getElementById('option-remove');
    
    // Inicializa listeners de perfil (carregamento, logout, etc.)
    const requestButton = document.getElementById('btn-request-psychologist');
    if (requestButton) {
        requestButton.addEventListener('click', handlePsychologistRequest);
    }
    const toggleButton = document.getElementById('btn-toggle-psychologist-request');
    if (toggleButton) {
        toggleButton.addEventListener('click', togglePsychologistRequestForm);
    }
    const logoutButton = document.querySelector('.logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Botão principal de edição e ícone (engrenagem)
    const toggleEditBtn = document.getElementById('toggle-edit-btn');
    if (toggleEditBtn) {
        toggleEditBtn.addEventListener('click', handleEditProfile);
    }

    const editButton = document.querySelector('.edit-btn');
    if (editButton) {
        editButton.addEventListener('click', handleEditProfile);
    }

    const cancelButton = document.querySelector('.cancel-edit-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            toggleEditMode(false);
        });
    }
    
    // Adiciona listener para SUBMIT do formulário (Salva dados gerais + foto, se houver)
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', handleSaveProfile);
    }
    
    // **CORREÇÃO:** Toggles o menu ao clicar na imagem
    if (profileAvatarEdit) {
        profileAvatarEdit.addEventListener('click', togglePhotoOptionsMenu);
    }
    
    // Oculta o menu ao clicar fora do menu ou da imagem
    document.addEventListener('click', hidePhotoOptions);

    // Lógica dos itens do menu (agora funcional)
    if (optionChange) {
        optionChange.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('photo-options-menu').style.display = 'none';
            if(profilePictureFile) profilePictureFile.click(); // Dispara o input de arquivo
        });
    }

    if (optionRemove) {
        optionRemove.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('photo-options-menu').style.display = 'none';
            if (confirm('Tem certeza que deseja remover sua foto de perfil?')) {
                saveProfilePicture(true); 
            }
        });
    }
    
    // Adiciona preview da imagem ao selecionar um arquivo
    if (profilePictureFile) {
        profilePictureFile.addEventListener('change', function() {
            if (this.files && this.files[0] && profileAvatarEdit) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileAvatarEdit.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    loadUserProfile();
});

function handleLogout() {
    localStorage.removeItem('jwt'); 
    localStorage.removeItem('user'); 
    localStorage.removeItem('token'); 
    window.location.href = 'login.html'; 
}

/**
 * Função utilitária para alternar entre o modo de visualização e edição (incluindo botões).
 */
function toggleEditMode(shouldShowEdit = null) {
    const viewDiv = document.getElementById('profile-view');
    const editFormDiv = document.getElementById('profile-edit-form');
    const viewButtons = document.getElementById('profile-actions-view');
    const editButtons = document.getElementById('profile-actions-edit');
    const menu = document.getElementById('photo-options-menu'); // Referência ao menu de foto

    if (!viewDiv || !editFormDiv || !viewButtons || !editButtons) {
        console.error("Elementos necessários para o toggle de edição não encontrados no DOM.");
        return;
    }
    
    const isEditModeActive = shouldShowEdit === true || (shouldShowEdit === null && viewDiv.style.display !== 'none');

    if (isEditModeActive) {
        viewDiv.style.display = 'none';
        editFormDiv.style.display = 'block';
        
        viewButtons.style.display = 'none';
        editButtons.style.display = 'flex'; 
    } else {
        viewDiv.style.display = 'block';
        editFormDiv.style.display = 'none';
        
        viewButtons.style.display = 'flex'; 
        editButtons.style.display = 'none';
    }

    // Se estiver saindo do modo de edição, esconde o menu de foto
    if (menu && isEditModeActive === false) {
        menu.style.display = 'none';
    }
}


/**
 * Função para manipular o clique no botão Editar Perfil.
 * Pré-preenche o formulário e exibe o modo de edição.
 */
function handleEditProfile(e) {
    e.preventDefault(); 
    
    // 1. ATIVA O MODO DE EDIÇÃO (EXIBE O FORMULÁRIO)
    toggleEditMode(true);
    
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            
            const editNameInput = document.getElementById('edit-name');
            const editEmailInput = document.getElementById('edit-email');
            
            if (editNameInput) editNameInput.value = user.nome || '';
            if (editEmailInput) editEmailInput.value = user.email || '';
            
            const editPhoneInput = document.getElementById('edit-phone');
            const editDobInput = document.getElementById('edit-dob');
            const editGenderInput = document.getElementById('edit-gender');
            const editCityInput = document.getElementById('edit-city');

            if (editPhoneInput) editPhoneInput.value = user.contato || ''; 
            if (editDobInput) editDobInput.value = user.data_nascimento ? user.data_nascimento.substring(0, 10) : ''; 
            if (editGenderInput) editGenderInput.value = user.genero || 'Prefiro não dizer';
            if (editCityInput) editCityInput.value = user.cidade || ''; 

            const profileAvatarView = document.getElementById('profile-avatar-view');
            const profileAvatarEdit = document.getElementById('profile-avatar-edit');
            const profilePictureFile = document.getElementById('profile-picture-file');
            
            if(profileAvatarEdit && profileAvatarView) profileAvatarEdit.src = profileAvatarView.src;
            if(profilePictureFile) profilePictureFile.value = ''; 
            
        } catch (e) {
            console.error('Erro ao analisar os dados do usuário para edição:', e);
            alert('Não foi possível carregar os dados para edição.');
        }
    }
}


/**
 * Envia o arquivo para o servidor ou envia um sinal para remover a foto.
 * @param {boolean} isRemoval - Indica se a ação é de remoção da foto.
 * @returns {Promise<string|null>} URL da nova foto ou null se removida/falha.
 */
async function saveProfilePicture(isRemoval = false) {
    const token = getToken();

    if (!token) {
        alert('Erro de autenticação: Token JWT ausente.');
        return null;
    }

    const profilePictureFile = document.getElementById('profile-picture-file');
    let file = profilePictureFile ? profilePictureFile.files[0] : null;
    
    if (!isRemoval && (!file || file.size === 0)) {
        return null; 
    }

    const formData = new FormData();
    
    if (!isRemoval) {
        formData.append('profile_picture', file);
    } else {
        formData.append('clear', 'true');
    }
    
    let button = isRemoval ? document.getElementById('option-remove') : null;
    if (button) showLoading(button);

    try {
        const response = await fetch(`${API_URL}/users/profile-picture-upload`, {
            method: 'POST', 
            headers: {
                'Authorization': `Bearer ${token}` 
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            const newUrl = result.foto_perfil_url; 
            
            const finalAvatarUrl = newUrl || defaultAvatarUrl;
            const profileAvatarView = document.getElementById('profile-avatar-view');
            const profileAvatarEdit = document.getElementById('profile-avatar-edit');
            const headerUserAvatar = document.getElementById('header-user-avatar');

            if(profileAvatarView) profileAvatarView.src = finalAvatarUrl;
            if(profileAvatarEdit) profileAvatarEdit.src = finalAvatarUrl;
            if(headerUserAvatar) headerUserAvatar.src = finalAvatarUrl;
            
            if(profilePictureFile) profilePictureFile.value = '';

            const user = JSON.parse(localStorage.getItem('user'));
            user.foto_perfil_url = newUrl;
            localStorage.setItem('user', JSON.stringify(user));
            
            if (isRemoval) alert(result.mensagem);

            return newUrl;

        } else {
            console.error(`Falha no upload: ${result.error || response.statusText}`);
            alert(`Falha ao processar a foto: ${result.error || 'Erro desconhecido.'}`);
            return null;
        }

    } catch (error) {
        console.error('Erro de rede/upload:', error);
        alert('Erro de conexão com o servidor ao fazer upload da foto.');
        return null;
    } finally {
        if (button) hideLoading(button);
        if (isRemoval) loadUserProfile(); 
    }
}


/**
 * Função principal para salvar as alterações do formulário (dados gerais + foto, se alterada).
 */
async function handleSaveProfile(e) {
    e.preventDefault();
    
    const token = getToken();
    const saveButton = document.querySelector('#profile-actions-edit .save-btn');
    
    if (!token) {
        alert('Você não está autenticado. Faça login novamente.');
        return;
    }

    showLoading(saveButton);
    
    try {
        const profilePictureFile = document.getElementById('profile-picture-file');
        const fileSelected = profilePictureFile && profilePictureFile.files.length > 0;

        // 1. Processa a Foto (se um novo arquivo foi selecionado)
        if (fileSelected) {
            const photoUploadResult = await saveProfilePicture(false); 
            if (photoUploadResult === null) {
                hideLoading(saveButton);
                return; 
            }
        }
        
        // 2. Coletar e Salvar Dados Gerais
        const name = document.getElementById('edit-name').value.trim();
        const phone = document.getElementById('edit-phone') ? document.getElementById('edit-phone').value.trim() : null;
        const dob = document.getElementById('edit-dob') ? document.getElementById('edit-dob').value.trim() : null;
        const gender = document.getElementById('edit-gender') ? document.getElementById('edit-gender').value.trim() : null;
        const city = document.getElementById('edit-city') ? document.getElementById('edit-city').value.trim() : null;
        
        const updatedData = {
            nome: name,
            contato: phone,
            data_nascimento: dob,
            genero: gender,
            cidade: city,
        };
        
        const GENERAL_PROFILE_UPDATE_URL = `${API_URL}/users/profile`; 
        
        const response = await fetch(GENERAL_PROFILE_UPDATE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        if (response.ok) {
            await loadUserProfile(); 
            toggleEditMode(false);
            
            alert('Perfil atualizado com sucesso!');
        } else {
            alert('Falha ao salvar os dados gerais do perfil: ' + (result.error || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error('Erro geral ao salvar perfil:', error);
        alert('Erro de conexão ou servidor ao salvar perfil.');
    } finally {
        hideLoading(saveButton);
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
        toggleButton.textContent = 'É profissional de saúde mental? Clique aqui para solicitar';
    }
}

/**
 * Função responsável por enviar a solicitação de alteração de perfil para psicólogo
 */
function handlePsychologistRequest() {
    const token = getToken();
    const especialidadeInput = document.getElementById('especialidade-input');
    const cfpInput = document.getElementById('cfp-input'); 
    const cpfInput = document.getElementById('cpf-input'); 
    const contatoInput = document.getElementById('contato-input');
    const statusMessage = document.getElementById('psychologist-request-status');
    
    statusMessage.textContent = '';
    statusMessage.style.color = 'green';
    
    if (!token) {
        statusMessage.textContent = 'Token de autenticação não encontrado. Por favor, faça login novamente.';
        statusMessage.style.color = 'red';
        return;
    }

    const especialidade = especialidadeInput ? especialidadeInput.value.trim() : '';
    const cfp = cfpInput ? cfpInput.value.trim() : '';
    const cpf = cpfInput ? cpfInput.value.trim() : ''; 
    const contato = contatoInput ? contatoInput.value.trim() : '';

    if (!especialidade || !cfp || !cpf || !contato) { 
        statusMessage.textContent = 'Especialidade, CFP, CPF e Contato são obrigatórios para a solicitação.';
        statusMessage.style.color = 'red';
        return;
    }
    
    statusMessage.textContent = 'Iniciando validação automática do CFP/CPF. Isso pode levar alguns segundos e pode falhar devido a bloqueios anti-bot.';
    
    fetch(`${API_URL}/users/psychologist-details`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ especialidade, cfp, cpf, contato }) 
    })
    .then(response => response.json().then(data => {
        if (!response.ok) {
            throw new Error(data.error || 'Erro desconhecido ao processar a solicitação.');
        }
        
        statusMessage.textContent = data.mensagem;
        statusMessage.style.color = 'green';
        
        especialidadeInput.value = '';
        cfpInput.value = ''; 
        cpfInput.value = '';
        contatoInput.value = '';

    }))
    .catch(error => {
        statusMessage.textContent = `Falha na solicitação: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error('Erro na solicitação de perfil de psicólogo:', error);
    });
}

/**
 * Função responsável por carregar os dados do usuário do backend (ou localStorage) 
 * e atualizar a interface.
 */
async function loadUserProfile() {
    const userJson = localStorage.getItem('user');
    const token = getToken();
    
    const profileNameElement = document.querySelector('.profile-name');
    const profileEmailElement = document.querySelector('.profile-email');
    const viewPhoneElement = document.getElementById('view-phone');
    const viewDobElement = document.getElementById('view-dob');
    const viewGenderElement = document.getElementById('view-gender');
    const viewCityElement = document.getElementById('view-city');
    
    const profileAvatarView = document.getElementById('profile-avatar-view');
    const profileAvatarEdit = document.getElementById('profile-avatar-edit');
    const headerUserAvatar = document.getElementById('header-user-avatar');
    
    let profileData = null;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user) return;


    try {
        const response = await fetch(`${API_URL}/users/${user.id_usuario}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            let serverData = await response.json();
            
            profileData = { ...user, ...serverData }; 
            
            localStorage.setItem('user', JSON.stringify(profileData));
        } else {
            profileData = user;
        }

    } catch (e) {
        console.warn('Erro ao buscar dados do servidor, usando dados locais.', e);
        profileData = user; 
    }
    
    // --- ATUALIZAÇÃO DA INTERFACE ---
    
    // 1. Atualiza AVATARES
    const finalAvatarUrl = profileData.foto_perfil_url || defaultAvatarUrl;
    if(profileAvatarView) profileAvatarView.src = finalAvatarUrl;
    if(profileAvatarEdit) profileAvatarEdit.src = finalAvatarUrl;
    if(headerUserAvatar) headerUserAvatar.src = finalAvatarUrl;
    
    // 2. Atualiza DADOS DE VISUALIZAÇÃO
    if (profileNameElement) profileNameElement.textContent = profileData.nome || 'Usuário Desconhecido';
    if (profileEmailElement) profileEmailElement.textContent = profileData.email || 'email@desconhecido.com';

    if (viewPhoneElement) viewPhoneElement.textContent = profileData.contato || '(XX) XXXXX-XXXX';
    if (viewDobElement) viewDobElement.textContent = formatDateForDisplay(profileData.data_nascimento);
    if (viewGenderElement) viewGenderElement.textContent = profileData.genero || 'Prefiro não dizer';
    if (viewCityElement) viewCityElement.textContent = profileData.cidade || 'Minha Cidade'; 

    // 3. ATUALIZA DADOS DE EDIÇÃO (Input Values - apenas se os inputs existirem)
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email'); 
    const editPhone = document.getElementById('edit-phone');
    const editDob = document.getElementById('edit-dob');
    const editGender = document.getElementById('edit-gender');
    const editCity = document.getElementById('edit-city');
    
    if (editName) editName.value = profileData.nome || '';
    if (editEmail) editEmail.value = profileData.email || 'Não Editável'; 
    if (editPhone) editPhone.value = profileData.contato || '';
    if (editDob) editDob.value = profileData.data_nascimento ? profileData.data_nascimento.substring(0, 10) : ''; 
    if (editGender) editGender.value = profileData.genero || 'Prefiro não dizer';
    if (editCity) editCity.value = profileData.cidade || 'Minha Cidade';
    
    // 4. Esconde o botão de solicitação de psicólogo se o usuário já for um psicólogo
    if (profileData.is_psicologo) {
        const requestSection = document.getElementById('psychologist-request-section');
        if (requestSection) {
            requestSection.innerHTML = '<h2>Perfil de Psicólogo Ativo</h2><p>Seu perfil de psicólogo está ativo. Você pode editar seus dados de especialidade e contato através do botão "Editar Perfil".</p>';
        }
    }
}