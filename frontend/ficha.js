const BACKEND_URL = 'http://localhost:3000';

// Função auxiliar para obter parâmetros da URL
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1); 
    const regex = /([^&=]+)=([^&]*)/g; 
    let m;
    while (m = regex.exec(queryString)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    return params;
}

// Função auxiliar para formatar a data (AAAA-MM-DD para DD/MM/AAAA)
function formatDisplayDate(dateString) {
    if (!dateString) return 'Não informado';
    // O backend retorna 'YYYY-MM-DD' para data_nascimento
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
}

// Função auxiliar para formatar a data e hora (AAAA-MM-DD HH:MM:SS para DD/MM/AAAA - HH:MM)
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'Data não informada';
    const date = new Date(dateTimeString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

function getStatusDisplay(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'aceita': 'Agendada',
        'recusada': 'Recusada',
        'confirmada': 'Confirmada'
    };
    return statusMap[status] || 'Desconhecido';
}

function getStatusClass(status) {
    // Classes de status podem ser estilizadas no seu arquivo style.css
    const classMap = {
        'pendente': 'status-pending',
        'aceita': 'status-scheduled',
        'recusada': 'status-rejected',
        'confirmada': 'status-confirmed'
    };
    return classMap[status] || 'status-default';
}

function renderConsultationCard(consultation) {
    const formattedDate = formatDateTime(consultation.data_solicitada);
    const statusDisplay = getStatusDisplay(consultation.status);
    const statusClass = getStatusClass(consultation.status);
    
    let rejectionReason = '';
    if (consultation.status === 'recusada' && consultation.motivo_recusa) {
        // Estilo inline para exemplo, deve ser transferido para style.css
        rejectionReason = `<p class="rejection-reason" style="color: #dc3545; font-size: 0.85em; margin-top: 5px;">Motivo Recusa: ${consultation.motivo_recusa}</p>`;
    }

    const card = document.createElement('a');
    // Apenas consultas aceitas ou confirmadas podem ser "clicáveis" (para detalhe/prontuário da sessão)
    const isClickable = (consultation.status === 'aceita' || consultation.status === 'confirmada');
    
    if (isClickable) {
        card.setAttribute('href', `consulta.html?consultaId=${consultation.id_solicitacao}`);
        card.classList.add('history-card'); 
    } else {
        // Se não for clicável, usa a div ou adiciona uma classe para desabilitar o estilo de link
        card.classList.add('history-card', 'non-clickable'); 
        card.removeAttribute('href'); // Garante que não haja navegação
    }
    
    card.innerHTML = `
        <div>
            <h4>${formattedDate}</h4>
            <p>Motivação: ${consultation.motivo || 'N/A'}</p>
        </div>
        <div class="status-badge ${statusClass}">Status: ${statusDisplay}</div>
        ${rejectionReason}
    `;

    return card;
}


async function loadConsultationHistory(patientId) {
    const token = localStorage.getItem('jwt');
    const historyList = document.getElementById('history-list');
    const loadingMessage = document.getElementById('history-loading-message');

    // Limpa o conteúdo e mostra o carregamento
    historyList.innerHTML = '';
    if (loadingMessage) {
         loadingMessage.style.display = 'block';
         historyList.appendChild(loadingMessage);
    }


    if (!token) {
        historyList.innerHTML = '<p class="error-message">Erro de autenticação. Por favor, faça login novamente.</p>';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/pacientes/${patientId}/historico`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const results = await response.json();
        
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (response.ok) {
            if (results.length === 0) {
                historyList.innerHTML = '<p class="no-data-message">Nenhuma consulta encontrada para este paciente.</p>';
                return;
            }

            results.forEach(consultation => {
                const card = renderConsultationCard(consultation);
                historyList.appendChild(card);
            });

        } else {
            console.error('Erro ao carregar histórico de consultas:', results.error);
            historyList.innerHTML = `<p class="error-message">Falha ao carregar histórico: ${results.error || response.statusText}</p>`;
        }

    } catch (error) {
        console.error('Erro de rede ao carregar histórico:', error);
        if (loadingMessage) loadingMessage.style.display = 'none';
        historyList.innerHTML = '<p class="error-message">Erro de conexão com o servidor ao buscar histórico.</p>';
    }
}


async function loadPatientDetails(patientId) {
    const token = localStorage.getItem('jwt');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const patientInfoCard = document.getElementById('patient-info-card');
    
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    patientInfoCard.style.display = 'none';

    if (!token) {
        errorMessage.textContent = 'Sessão expirada. Por favor, faça login novamente.';
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/pacientes/${patientId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            // Sucesso: Preenche os campos do HTML
            document.getElementById('patient-name').textContent = result.nome || 'Nome Desconhecido';
            document.getElementById('patient-id').textContent = patientId;
            document.getElementById('patient-email').textContent = result.email || 'Não informado';
            
            const displayGender = (result.genero && result.genero !== 'indefinido') ? 
                                  result.genero.charAt(0).toUpperCase() + result.genero.slice(1) : 'Não informado';
            document.getElementById('patient-gender').textContent = displayGender;
            document.getElementById('patient-dob').textContent = formatDisplayDate(result.data_nascimento);
            document.getElementById('patient-contact').textContent = result.contato || 'Não informado';
            
            patientInfoCard.style.display = 'block';
            
            // CHAMA A FUNÇÃO PARA CARREGAR O HISTÓRICO DE CONSULTAS APÓS O SUCESSO
            await loadConsultationHistory(patientId);

        } else {
            console.error('Erro ao carregar detalhes do paciente:', result.error);
            errorMessage.textContent = `Erro ao carregar prontuário: ${result.error || response.statusText}. Verifique se você está logado como o psicólogo correto.`;
            errorMessage.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro de rede:', error);
        errorMessage.textContent = 'Erro de conexão com o servidor ao buscar dados do paciente.';
        errorMessage.style.display = 'block';

    } finally {
        loadingMessage.style.display = 'none';
    }
}


// Inicia o processo quando a página é carregada
document.addEventListener('DOMContentLoaded', () => {
    const params = getQueryParams();
    const patientId = params.pacienteId; // Obtém o ID do paciente do parâmetro 'pacienteId' da URL

    if (patientId) {
        loadPatientDetails(patientId);
    } else {
        document.getElementById('error-message').textContent = 'ID do paciente não fornecido na URL. Retorne à página de Consultas.';
        document.getElementById('error-message').style.display = 'block';
    }
});