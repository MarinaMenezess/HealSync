// ARQUIVO: frontend/registers.js (COMPLETO E ATUALIZADO PARA BLOQUEIO VISUAL)


// Adicionado função auxiliar para obter o status de inativação
function getLoggedInUserPostingStatus() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            // Retorna TRUE se a conta estiver ATIVA, FALSE se estiver inativa (0)
            return user.is_active_for_posting === 1 || user.is_active_for_posting === true; 
        } catch (e) {
            console.error("Erro ao ler status de posting:", e);
        }
    }
    return true; // Assume true se não há dados de login
}

// Função auxiliar para formatar a data (espera AAAA-MM-DD ou AAAA-MM-DDTHH:MM:SS.sssZ e retorna DD/MM/AAAA)
function formatDisplayDate(dateString) {
    if (!dateString) return 'Data não informada';

    // 1. Isola apenas a parte da data (YYYY-MM-DD), ignorando o tempo e fuso horário.
    const datePart = dateString.split('T')[0];
    
    // 2. Divide a string no formato AAAA-MM-DD
    const parts = datePart.split('-');
    
    if (parts.length === 3) {
        // 3. Reorganiza para DD/MM/AAAA
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    return dateString;
}

// NOVA FUNÇÃO: Publicar um registro (inclui verificação de status)
async function publishRegister(registerId) {
    const token = localStorage.getItem('jwt');
    // Verifica a inativação antes de iniciar a ação
    if (!getLoggedInUserPostingStatus()) {
         alert('Sua conta foi inativada para novas postagens e comentários devido a múltiplas denúncias.');
         return;
    }

    if (!token) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        return;
    }

    if (!confirm('Tem certeza que deseja publicar este registro?')) {
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/registros/${registerId}/publish`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensagem);
            // Recarrega a lista para refletir a mudança de status
            loadUserRegisters(); 
        } else if (response.status === 403) { 
             // Captura o bloqueio do servidor para publicação/edição
             const error = await response.json();
             alert(error.error);
        } else {
            alert(`Falha ao publicar registro: ${result.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Erro de rede ao publicar registro:', error);
        alert('Erro de conexão com o servidor ao publicar seu registro.');
    }
}

// Renderiza um cartão de registro individual
function renderRegisterCard(register) {
    const card = document.createElement('div');
    card.classList.add('register-card');
    
    card.setAttribute('data-register-id', register.id_registro);
    card.onclick = () => {
        alert(`Redirecionando para a visualização do Registro ID: ${register.id_registro}`);
    };

    const formattedDate = formatDisplayDate(register.data);
    const emotion = register.emocao || 'Não informado';
    const preview = register.descricao ? register.descricao.split('\n')[0].substring(0, 70) : 'Sem descrição.';

    // Novos campos de status
    const isPublic = register.is_public == 1 || register.is_public === true;
    const isDenounced = register.is_denounced == 1 || register.is_denounced === true; 
    const isActive = getLoggedInUserPostingStatus(); // Verifica o status de inativação

    
    let actionButtonsHTML = '';
    
    // 1. Lógica de sinalização Denunciado (Prioridade máxima)
    if (isDenounced) {
        actionButtonsHTML = `<p style="color: #dc3545; font-weight: bold; margin: 0; padding: 4px 8px; border: 1px solid #dc3545; border-radius: 4px; background-color: #3b1b1b;">DENUNCIADO</p>`;
    } 
    // 2. Lógica de Bloqueio Visual para Usuário Inativado
    else if (!isActive) {
         actionButtonsHTML = `<p style="color: #ffc107; font-weight: bold; margin: 0; padding: 4px 8px; border: 1px solid #ffc107; border-radius: 4px; background-color: #3b301b;">BLOQUEADO</p>`;
         // Não exibe os botões de Publicar/Editar
    }
    // 3. Lógica para Usuário Ativo e Não Denunciado
    else {
        const publishButton = isPublic ? 
            `<button class="published-btn" disabled style="background-color: #28a745; cursor: default;">Público</button>` : 
            `<button class="publish-btn" onclick="event.stopPropagation(); publishRegister(${register.id_registro})">
                Publicar
            </button>`;

        actionButtonsHTML = `
            ${publishButton}
            <button class="edit-register" onclick="event.stopPropagation(); alert('Editar Registro ID: ${register.id_registro}')">
                Editar
            </button>
        `;
    }


    card.innerHTML = `
        <div class="register-card-header">
            <h4>${emotion.toUpperCase()}</h4>
            <span class="date">${formattedDate}</span>
        </div>
        <p style="font-size: 0.9em; color: #d4d4d4; text-align: left;">${preview}</p>
        <div style="display: flex; justify-content: flex-end; width: 100%; gap: 10px;">
            ${actionButtonsHTML}
        </div>
    `;

    return card;
}

// Função principal para buscar e exibir os registros
async function loadUserRegisters() {
    const token = localStorage.getItem('jwt');
    const registersContainer = document.getElementById('registers-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    loadingMessage.style.display = 'block';
    registersContainer.innerHTML = '';
    errorMessage.style.display = 'none';

    if (!token) {
        errorMessage.textContent = 'Sessão expirada. Por favor, faça login novamente.';
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/registros`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            if (result.length === 0) {
                registersContainer.innerHTML = '<p style="color: #f1eee4; font-size: 1.1em; text-align: center;">Você ainda não tem registros no seu diário.</p>';
            } else {
                result.forEach(register => {
                    const card = renderRegisterCard(register);
                    registersContainer.appendChild(card);
                });
            }
        } else {
            console.error('Erro ao carregar registros:', result.error);
            errorMessage.textContent = `Falha ao carregar registros: ${result.error || response.statusText}`;
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro de rede ao buscar registros:', error);
        errorMessage.textContent = 'Erro de conexão com o servidor ao buscar seus registros.';
        errorMessage.style.display = 'block';
    } finally {
        loadingMessage.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', loadUserRegisters);