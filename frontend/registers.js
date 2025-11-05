// ARQUIVO: frontend/registers.js (COMPLETO E ATUALIZADO PARA BLOQUEIO)

const BACKEND_URL = 'http://localhost:3000';

// Função auxiliar para formatar a data (espera AAAA-MM-DD ou AAAA-MM-DDTHH:MM:SS.sssZ e retorna DD/MM/AAAA)
function formatDisplayDate(dateString) {
    if (!dateString) return 'Data não informada';

    // 1. Isola apenas a parte da data (YYYY-MM-DD), ignorando o tempo e fuso horário.
    const datePart = dateString.split('T')[0];
    
    // 2. Divide a string no formato AAAA-MM-DD
    const parts = datePart.split('-');
    
    if (parts.length === 3) {
        // 3. Reorganiza para DD/MM/AAAA
        // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // 4. Se o formato for inesperado, retorna a string original.
    return dateString;
}

// NOVA FUNÇÃO: Publicar um registro (inclui verificação de status)
async function publishRegister(registerId) {
    const token = localStorage.getItem('jwt');
    // Verifica a inativação antes de iniciar a ação
    const userJson = localStorage.getItem('user');
    if (userJson) {
        const user = JSON.parse(userJson);
        if (user.is_active_for_posting === 0 || user.is_active_for_posting === false) {
             alert('Sua conta foi inativada para novas postagens e comentários devido a múltiplas denúncias.');
             return;
        }
    }
    // Fim da verificação

    if (!token) {
        alert('Sessão expirada. Por favor, faça login novamente.');
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
    // Adiciona link para a página de visualização/edição completa (assumindo que existe)
    card.setAttribute('data-register-id', register.id_registro);
    // Link de navegação (apenas para exemplo, a rota view-register.html precisa ser criada)
    card.onclick = () => {
        alert(`Redirecionando para a visualização do Registro ID: ${register.id_registro}`);
        // window.location.href = `./view-register.html?registerId=${register.id_registro}`;
    };

    const formattedDate = formatDisplayDate(register.data);
    const emotion = register.emocao || 'Não informado';
    // Exibe apenas a primeira linha da descrição
    const preview = register.descricao ? register.descricao.split('\n')[0].substring(0, 70) : 'Sem descrição.';

    // Novos campos de status
    const isPublic = register.is_public == 1 || register.is_public === true;
    const isDenounced = register.is_denounced == 1 || register.is_denounced === true; 
    
    let actionButtonsHTML = '';
    
    // Lógica para o botão de status e ações
    if (isDenounced) {
        // Se denunciado: Apenas a sinalização e botões desabilitados
        actionButtonsHTML = `
            <p style="color: #dc3545; font-weight: bold; margin: 0; padding: 4px 8px; border: 1px solid #dc3545; border-radius: 4px; background-color: #3b1b1b;">DENUNCIADO</p>
            <button class="published-btn" disabled style="cursor: default;">Editar</button>
        `;
    } else {
        // Se não denunciado: Botões de Publicar/Público e Editar
        const publishButton = isPublic ? 
            `<button class="published-btn" disabled style="background-color: #28a745; cursor: default;">Público</button>` : 
            // Permite a publicação (chama a função que verifica a inativação no clique)
            `<button class="publish-btn" onclick="event.stopPropagation(); publishRegister(${register.id_registro})">
                Publicar
            </button>`;

        actionButtonsHTML = `
            ${publishButton}
            <button class="publish-btn" onclick="event.stopPropagation(); alert('Editar Registro ID: ${register.id_registro}')">
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
        // A rota agora retorna o campo is_denounced e is_public
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