// ARQUIVO: frontend/consultas.js (COMPLETO E ATUALIZADO)

let currentRequestId = null;
const BACKEND_URL = 'http://localhost:3000';

// Função auxiliar para formatar a data
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} - ${hours}:${minutes}`;
}

// =================================================================
// LÓGICA DE AÇÃO (ACEITAR/RECUSAR)
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
            alert(`Solicitação ${status} com sucesso!`);
            // Recarrega apenas a seção de solicitações após a ação
            loadPendingRequests();
        } else if (response.status === 403) {
             alert(`Acesso negado: ${result.error}`);
        } else {
            console.error('Erro na ação:', result.error);
            alert(`Falha ao ${status} a solicitação: ${result.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao servidor ao processar a solicitação.');
    }
}

function handleReasonSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const textarea = form.querySelector('#reason-textarea');
    const reason = textarea.value;

    if (!reason) {
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
// LÓGICA DE CARREGAMENTO DE DADOS (GET)
// =================================================================

async function loadPendingRequests() {
    const requestsContainer = document.getElementById('requests-content');
    requestsContainer.innerHTML = ''; // Limpa o conteúdo anterior

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
                
                // Formata a data/hora solicitada
                const formattedDate = formatDate(request.data_solicitada);
                
                // O nome_paciente e o motivo (motivo_recusa) são os campos relevantes
                const patientName = request.nome_paciente || 'Paciente Desconhecido';
                const requestTitle = request.motivo_recusa || 'Sem Título/Motivo'; 

                requestCard.innerHTML = `
                    <div class="request-info">
                        <h4>${patientName}</h4>
                        <span class="date">Data Solicitada: ${formattedDate}</span>
                        <p class="request-title" style="font-size: 0.9em; color: #555;">Motivo: ${requestTitle}</p>
                    </div>
                    <div class="request-buttons">
                        <button class="accept-btn" data-id="${request.id_solicitacao}">Aceitar</button>
                        <button class="reject-btn" data-id="${request.id_solicitacao}">Recusar</button>
                    </div>
                `;

                requestsContainer.appendChild(requestCard);
            });
            
            // Adiciona event listeners para os botões Aceitar/Recusar
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
            // Acesso negado: O usuário logado é um paciente, não um psicólogo
             requestsContainer.innerHTML = '<p class="error-message">Acesso negado. Apenas psicólogos podem visualizar solicitações.</p>';
        } else {
            requestsContainer.innerHTML = `<p class="error-message">Erro ao carregar solicitações: ${results.error || response.statusText}</p>`;
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
    
    // Mapeamento de hash para ID da seção e título
    const hashToSection = {
        'solicitacoes': { id: 'requests-content', title: 'Solicitações', loadFunction: loadPendingRequests },
        'pacientes': { id: 'notes-content', title: 'Pacientes' },
        'agenda': { id: 'agenda-content', title: 'Agenda' }
    };

    function handleHashChange() {
        // Obtém o hash da URL, removendo o '#' inicial. O padrão é 'agenda' se não houver hash.
        const hash = window.location.hash ? window.location.hash.substring(1) : 'agenda';
        const sectionData = hashToSection[hash];

        if (sectionData) {
            // Oculta todas as seções
            document.querySelectorAll('.requests-container, .agenda-container, .notes-container').forEach(section => {
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
    const submitReasonButton = document.getElementById('submit-reason-btn'); // Novo seletor

    if (reasonModalContainer) {
        closeModalButton.addEventListener('click', closeReasonModal);
        cancelReasonButton.addEventListener('click', closeReasonModal);
        // Adiciona o listener de submit ao botão do modal
        if (submitReasonButton) {
            const form = document.getElementById('reason-form');
            if (form) {
                 submitReasonButton.addEventListener('click', (e) => {
                    // Evita que o botão submit acione o evento sem o formulário ser configurado.
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