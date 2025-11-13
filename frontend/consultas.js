let currentRequestId = null;

// Função auxiliar para formatar a data (DD/MM - HH:MM)
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} - ${hours}:${minutes}`;
}

// =================================================================
// LÓGICA DE AÇÃO (ACEITAR/RECUSAR) - PUT /consultas/:id
// =================================================================

async function handleRequestAction(requestId, status, reason = null) {
    const token = localStorage.getItem('jwt');

    if (!token) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        window.location.href = 'login.html';
        return;
    }

    const payload = {
        status: status,
        // O backend espera motivo_recusa apenas se o status for 'recusada'
        motivo_recusa: status === 'recusada' ? reason : null
    };

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Solicitação ${status === 'aceita' ? 'aceita' : 'recusada'} com sucesso!`);
            // Recarrega a lista de solicitações
            loadPendingRequests();
            
            // Se aceito, o calendário precisa ser atualizado (se estiver na agenda.js)
            if (status === 'aceita') {
                if (window.calendar) {
                    window.calendar.refetchEvents();
                }
            }

        } else if (response.status === 403) {
             alert(`Acesso negado: ${result.error}`);
        } else {
            console.error('Erro na ação:', result.error);
            alert(`Falha ao ${status === 'aceita' ? 'aceitar' : 'recusar'} a solicitação: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao servidor ao processar a solicitação.');
    }
}

// Lógica de manipulação do Modal de Recusa
function handleReasonSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const textarea = form.querySelector('#reason-textarea');
    const reason = textarea.value;

    if (!reason || reason.trim() === '') {
        alert('Por favor, insira o motivo da recusa.');
        return;
    }

    // Chama a função de ação para recusar
    handleRequestAction(currentRequestId, 'recusada', reason);
    closeReasonModal();
}

function openReasonModal(requestId) {
    const reasonModalContainer = document.getElementById('reason-modal-container');
    reasonModalContainer.classList.add('active');
    currentRequestId = requestId;
    const form = document.getElementById('reason-form');
    form.removeEventListener('submit', handleReasonSubmit);
    form.addEventListener('submit', handleReasonSubmit);
}

function closeReasonModal() {
    const reasonModalContainer = document.getElementById('reason-modal-container');
    reasonModalContainer.classList.remove('active');
    document.getElementById('reason-form').reset();
    const form = document.getElementById('reason-form');
    form.removeEventListener('submit', handleReasonSubmit);
}


// =================================================================
// LÓGICA DE CARREGAMENTO DE DADOS (GET /consultas/pendentes)
// =================================================================

async function loadPendingRequests() {
    const requestsContainer = document.getElementById('requests-content');
    requestsContainer.innerHTML = ''; // Limpa o conteúdo anterior
    requestsContainer.classList.remove('hidden-section');

    const token = localStorage.getItem('jwt');

    if (!token) {
        requestsContainer.innerHTML = '<p class="error-message">Erro de autenticação. Faça login novamente.</p>';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/pendentes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const results = await response.json();

        if (response.ok) {
            if (results.length === 0) {
                requestsContainer.innerHTML = '<p class="no-data-message">Não há solicitações pendentes no momento.</p>';
                return;
            }

            results.forEach(request => {
                const requestCard = document.createElement('div');
                requestCard.classList.add('request-card');
                
                const formattedDate = formatDate(request.data_solicitada);
                
                const patientName = request.nome_paciente || 'Paciente Desconhecido';
                const requestTitle = request.motivo || 'Sem Motivo'; // Usando 'motivo' conforme o backend atualizado

                // CORRIGIDO: Link para a página de consulta usando o parâmetro 'id'
                const consultationLink = `consulta.html?id=${request.id_solicitacao}`;

                requestCard.innerHTML = `
                    <a href="${consultationLink}" class="request-link">
                        <div class="request-info">
                            <h4>${patientName}</h4>
                            <span class="date">${formattedDate}</span>
                            <p class="request-title" style="font-size: 0.9em; color: #555; margin-top: 5px;">Motivo: ${requestTitle}</p>
                        </div>
                    </a>
                    <div class="request-buttons">
                        <button class="accept-btn" data-id="${request.id_solicitacao}">Aceitar</button>
                        <button class="reject-btn" data-id="${request.id_solicitacao}">Recusar</button>
                    </div>
                `;

                requestsContainer.appendChild(requestCard);
            });
            
            requestsContainer.querySelectorAll('.accept-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const requestId = button.getAttribute('data-id');
                    handleRequestAction(requestId, 'aceita');
                });
            });

            requestsContainer.querySelectorAll('.reject-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const requestId = button.getAttribute('data-id');
                    openReasonModal(requestId);
                });
            });


        } else if (response.status === 403) {
             requestsContainer.innerHTML = '<p class="error-message">Acesso negado. Apenas psicólogos podem visualizar solicitações pendentes.</p>';
        } else {
            requestsContainer.innerHTML = `<p class="error-message">Erro ao carregar solicitações: ${results.error || response.statusText}.</p>`;
        }

    } catch (error) {
        console.error('Erro de rede ao carregar solicitações:', error);
        requestsContainer.innerHTML = '<p class="error-message">Erro de conexão com o servidor. Verifique se o backend está ativo.</p>';
    }
}


// Lógica principal de roteamento e exibição de seções
document.addEventListener('DOMContentLoaded', () => {
    const requestsDropdownToggle = document.getElementById('requests-dropdown-toggle');
    const requestsDropdown = document.querySelector('.requests-dropdown');
    const requestsTitle = document.querySelector('.requests-title');
    
    // Mapeamento de hash para ID da seção, título e função de carregamento (removendo 'pacientes')
    const hashToSection = {
        'solicitacoes': { id: 'requests-content', title: 'Solicitações', loadFunction: loadPendingRequests }, 
        'agenda': { id: 'agenda-content', title: 'Agenda' } 
    };

    function handleHashChange() {
        // Define 'agenda' como o hash padrão
        const hash = window.location.hash ? window.location.hash.substring(1) : 'agenda'; 
        const sectionData = hashToSection[hash];

        if (sectionData) {
            // Oculta todas as seções (removendo .notes-container)
            document.querySelectorAll('.requests-container, .agenda-container').forEach(section => {
                section.classList.add('hidden-section');
            });

            // Exibe a seção correspondente ao hash
            const targetSection = document.getElementById(sectionData.id);
            if (targetSection) {
                targetSection.classList.remove('hidden-section');
            }

            // Atualiza o título do header
            if (requestsTitle) {
                requestsTitle.textContent = sectionData.title;
            }
            
            // Chama a função de carregamento dinâmico se existir
            if (sectionData.loadFunction) {
                sectionData.loadFunction();
            }
        }
    }

    // Configuração inicial do dropdown
    if (requestsDropdownToggle && requestsDropdown) {
        requestsDropdownToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            requestsDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (event) => {
            if (!requestsDropdown.contains(event.target) && !requestsDropdownToggle.contains(event.target)) {
                requestsDropdown.classList.remove('show');
            }
        });
    }

    // Gerencia o fechamento do modal de motivo de recusa
    const reasonModalContainer = document.getElementById('reason-modal-container');
    const closeModalButton = document.getElementById('close-reason-modal-btn');
    const cancelReasonButton = document.getElementById('cancel-reason-btn');
    const submitReasonButton = document.getElementById('submit-reason-btn'); 

    if (reasonModalContainer) {
        closeModalButton.addEventListener('click', closeReasonModal);
        cancelReasonButton.addEventListener('click', closeReasonModal);
        
        if (submitReasonButton) {
            const form = document.getElementById('reason-form');
            if (form) {
                 submitReasonButton.addEventListener('click', (e) => {
                     e.preventDefault(); 
                     form.dispatchEvent(new Event('submit'));
                 });
            }
        }
    
        reasonModalContainer.addEventListener('click', (e) => {
            if (e.target.id === 'reason-modal-container') {
                closeReasonModal();
            }
        });
    }
    
    // Evento para quando o hash da URL muda.
    window.addEventListener('hashchange', handleHashChange);

    // Chama a função de manipulação do hash na carga inicial da página
    handleHashChange();
});