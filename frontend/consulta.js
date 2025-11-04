const BACKEND_URL = 'http://localhost:3000';
let currentPatientId = null; 
let isPsychologist = false; 

// Variáveis Globais do Cronômetro
let timerInterval = null;
let elapsedTime = 0; // Tempo em milissegundos
const TIMER_KEY = 'consultationTimer_'; 
let currentConsultationId = null; 
let currentSessionNoteId = null; // ID da anotação da sessão atual (se existir)

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
    const classMap = {
        'pendente': 'status-pending',
        'aceita': 'status-scheduled',
        'recusada': 'status-rejected',
        'confirmada': 'status-confirmed'
    };
    return classMap[status] || 'status-default';
}

// ---------------------- LÓGICA DO CRONÔMETRO ----------------------

function formatTime(ms) {
    if (!ms || ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateTimerDisplay() {
    document.getElementById('stopwatch-time').textContent = formatTime(elapsedTime);
}

function updateStopwatchButtons(isStarting = false) {
    const startStopBtn = document.getElementById('start-stop-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (timerInterval) {
        startStopBtn.textContent = 'Parar e Salvar';
        startStopBtn.classList.remove('start-btn');
        startStopBtn.classList.add('stop-btn');
        resetBtn.disabled = true;
    } else {
        startStopBtn.textContent = (elapsedTime > 0 && !isStarting) ? 'Continuar' : 'Iniciar';
        startStopBtn.classList.remove('stop-btn');
        startStopBtn.classList.add('start-btn');
        resetBtn.disabled = elapsedTime === 0;
    }
}

function saveTimerState() {
    if (currentConsultationId) {
        localStorage.setItem(TIMER_KEY + currentConsultationId, JSON.stringify({
            elapsedTime: elapsedTime,
            isRunning: !!timerInterval,
            startTime: timerInterval ? Date.now() - elapsedTime : null
        }));
    }
    updateStopwatchButtons();
}

function loadTimerState() {
    if (currentConsultationId) {
        const storedState = localStorage.getItem(TIMER_KEY + currentConsultationId);
        if (storedState) {
            const state = JSON.parse(storedState);
            elapsedTime = state.elapsedTime || 0;
            
            if (state.isRunning && state.startTime) {
                elapsedTime += Date.now() - state.startTime;
                startTimer(false); 
            }
            updateTimerDisplay();
        } else {
            elapsedTime = 0;
            updateTimerDisplay();
        }
    }
    updateStopwatchButtons();
}

function tick() {
    elapsedTime += 1000;
    updateTimerDisplay();
    saveTimerState(); 
}

function startTimer(saveState = true) {
    if (timerInterval) return; 

    timerInterval = setInterval(tick, 1000);
    
    if (saveState) saveTimerState();
    updateStopwatchButtons(true);
}

async function saveConsultationTime(durationMs) {
    const token = localStorage.getItem('jwt');
    const startStopBtn = document.getElementById('start-stop-btn');
    const initialText = startStopBtn.textContent;
    
    startStopBtn.textContent = 'Salvando...';
    startStopBtn.disabled = true;
    document.getElementById('reset-btn').disabled = true;

    if (!token) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        startStopBtn.textContent = initialText;
        startStopBtn.disabled = false;
        return;
    }
    
    if (durationMs === 0) {
        startStopBtn.textContent = 'Iniciar';
        startStopBtn.disabled = false;
        document.getElementById('reset-btn').disabled = false;
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/${currentConsultationId}/duracao`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ duracao_ms: durationMs })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Duração da consulta (${formatTime(durationMs)}) salva com sucesso! O status foi atualizado para CONFIRMADA.`);
            
            stopTimerInternal(false); 
            resetTimerInternal(false); 
            localStorage.removeItem(TIMER_KEY + currentConsultationId); 
            
            await loadConsultationDetails(currentConsultationId); 
            
        } else {
            console.error('Erro ao salvar duração:', result.error);
            alert(`Falha ao salvar duração: ${result.error || response.statusText}. Por favor, tente novamente.`);
            
            startStopBtn.textContent = 'Continuar'; 
            startStopBtn.disabled = false;
            document.getElementById('reset-btn').disabled = false;
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao servidor ao salvar duração.');
        startStopBtn.textContent = 'Continuar'; 
        startStopBtn.disabled = false;
        document.getElementById('reset-btn').disabled = false;
    }
}

// Versão interna do stopTimer que não chama a função de salvar
function stopTimerInternal(saveState = true) {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;
    
    if (saveState) saveTimerState();
    updateStopwatchButtons();
}

// Versão pública do stopTimer, agora disparando o salvamento
function stopTimer() {
    if (!timerInterval) return; 

    saveTimerState(); 
    
    stopTimerInternal(false); 

    saveConsultationTime(elapsedTime);
}

// Versão interna do resetTimer que não limpa o localStorage
function resetTimerInternal(clearStorage = true) {
    stopTimerInternal(false);
    elapsedTime = 0;
    updateTimerDisplay();
    
    if (clearStorage && currentConsultationId) {
        localStorage.removeItem(TIMER_KEY + currentConsultationId); 
    }
    updateStopwatchButtons();
}

// Versão pública do resetTimer
function resetTimer() {
    resetTimerInternal(true);
}

function toggleTimer() {
    if (timerInterval) {
        stopTimer(); 
    } else {
        startTimer();
    }
}

function initializeStopwatchListeners(consultaId) {
    currentConsultationId = consultaId;
    loadTimerState();

    const startStopBtn = document.getElementById('start-stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // Limpa e adiciona listeners
    startStopBtn.removeEventListener('click', toggleTimer);
    resetBtn.removeEventListener('click', resetTimer);
    window.removeEventListener('beforeunload', saveTimerState);
    
    startStopBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    window.addEventListener('beforeunload', saveTimerState);

    updateStopwatchButtons();
}


// ---------------------- LÓGICA DE GERENCIAMENTO DA ANOTAÇÃO ÚNICA DA SESSÃO ----------------------

// Renderiza o bloco de anotações no modo de edição (textarea)
function renderEditMode(noteContent) {
    const noteContentContainer = document.getElementById('session-note-content-area');
    
    noteContentContainer.innerHTML = `
        <textarea id="session-note-textarea" placeholder="Registre aqui suas observações sobre a sessão...">${noteContent || ''}</textarea>
        <button id="save-session-note-btn" class="save-button">Salvar Anotação</button>
    `;
    document.getElementById('save-session-note-btn').addEventListener('click', handleSaveNote);
}

// Renderiza o bloco de anotações no modo de visualização
function renderSessionNote(content, noteId) {
    const noteContentContainer = document.getElementById('session-note-content-area');
    const formattedDate = formatDateTime(new Date().toISOString());

    noteContentContainer.innerHTML = `
        <div class="saved-note-card">
            <div class="note-header-info">
                <h4>Anotação da Sessão (Última Edição: ${formattedDate.split(' - ')[0]})</h4>
                <button id="edit-session-note-btn" class="save-button edit-btn">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.121z"/>
                        <path fill-rule="evenodd" d="M1.5 13.5A.5.5 0 0 0 2 14v1a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-11z"/>
                    </svg> Editar
                </button>
            </div>
            <p>${content}</p>
        </div>
    `;
    
    document.getElementById('edit-session-note-btn').addEventListener('click', () => {
        currentSessionNoteId = noteId; 
        renderEditMode(content);
    });
}

// Lógica principal de salvar/atualizar a anotação da sessão
async function handleSaveNote() {
    const token = localStorage.getItem('jwt');
    const noteContentContainer = document.getElementById('session-note-content-area');
    const currentNoteTextarea = noteContentContainer.querySelector('textarea');
    const saveBtn = document.getElementById('save-session-note-btn');
    const initialText = saveBtn.textContent;
    
    const conteudo = currentNoteTextarea.value.trim();
    const noteId = currentSessionNoteId; 

    if (!conteudo || !currentPatientId || !currentConsultationId) {
        alert('A anotação não pode estar vazia ou a consulta não foi carregada.');
        return;
    }

    saveBtn.textContent = noteId ? 'Atualizando...' : 'Salvando...';
    saveBtn.disabled = true;

    try {
        let url;
        let method;

        if (noteId) {
            url = `${BACKEND_URL}/consultas/${currentConsultationId}/session-note`; 
            method = 'PUT';
        } else {
            url = `${BACKEND_URL}/consultas/${currentConsultationId}/session-note`;
            method = 'POST';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id_paciente: currentPatientId, conteudo: conteudo })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Anotação ${noteId ? 'atualizada' : 'salva'} com sucesso!`);
            
            if (!noteId && result.id_anotacao) {
                currentSessionNoteId = result.id_anotacao;
            }
            
            renderSessionNote(conteudo, currentSessionNoteId);
            
            await loadPatientHistoryNotes(currentPatientId);

        } else {
            console.error('Erro ao salvar/atualizar anotação:', result.error);
            alert(`Falha ao salvar/atualizar anotação: ${result.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao servidor ao salvar anotação.');
    } finally {
        saveBtn.textContent = initialText;
        saveBtn.disabled = false;
    }
}


// Função para carregar a nota da sessão específica (GET /consultas/:id/session-note)
async function loadSessionNote(consultaId) {
    const token = localStorage.getItem('jwt');
    const noteContentContainer = document.getElementById('session-note-content-area');

    if (!token) {
        noteContentContainer.innerHTML = '<p class="error-message">Erro de autenticação.</p>';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/${consultaId}/session-note`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const note = await response.json();
        
        currentSessionNoteId = null; 

        if (response.ok && note && note.conteudo) {
            // Anotação encontrada: MODO VISUALIZAÇÃO
            currentSessionNoteId = note.id_anotacao;
            renderSessionNote(note.conteudo, note.id_anotacao);
        } else {
            // Nenhuma anotação encontrada (ou 404): MODO EDIÇÃO/CRIAÇÃO
            renderEditMode('');
        }

    } catch (error) {
        console.error('Erro de rede ao carregar anotação da sessão:', error);
        renderEditMode('Falha ao carregar a última anotação. Você pode continuar a registrar aqui.');
    }
}


// Função para carregar notas ANTERIORES (Histórico)
function renderHistoryNoteCard(note) {
    const card = document.createElement('div');
    card.classList.add('history-card'); 
    
    const formattedDate = formatDateTime(note.data_anotacao);
    const isLinkedToConsultation = note.id_consulta && note.id_consulta !== null;

    let buttonHtml;
    let clickHandler;
    
    if (isLinkedToConsultation) {
        // Redirecionamento para a consulta específica
        buttonHtml = `<button class="view-note-btn save-button" style="padding: 5px 10px; font-size: 0.8em; margin-top: 5px; background-color: #637cc7;">Ver Consulta</button>`;
        
        clickHandler = (e) => {
            e.preventDefault();
            window.location.href = `./consulta.html?consultaId=${note.id_consulta}`;
        };
        
    } else {
        // Comportamento original: Exibe um alerta com o conteúdo completo
        const contentEncoded = encodeURIComponent(note.conteudo);
        buttonHtml = `<button class="view-note-btn save-button" data-content="${contentEncoded}" style="padding: 5px 10px; font-size: 0.8em; margin-top: 5px; background-color: #637cc7;">Ver Completo</button>`;
        
        clickHandler = (e) => {
            e.preventDefault();
            const content = decodeURIComponent(e.target.getAttribute('data-content'));
            alert(`Anotação Completa:\n\n${content}`);
        };
    }


    card.innerHTML = `
        <div>
            <h4>Anotação de ${formattedDate.split(' - ')[0]}</h4>
            <div class="note-content-preview">${note.conteudo.substring(0, 150)}...</div>
        </div>
        ${buttonHtml}
    `;
    
    const button = card.querySelector('.view-note-btn');
    button.addEventListener('click', clickHandler);
    
    return card;
}


async function loadPatientHistoryNotes(patientId) {
    const notesListContainer = document.getElementById('notes-list-container');
    const token = localStorage.getItem('jwt');

    notesListContainer.innerHTML = '';
    notesListContainer.innerHTML = '<p id="notes-loading-message" style="text-align: center; color: #7873f5; font-size: 1em;">Carregando histórico...</p>';
    
    if (!token) {
        notesListContainer.innerHTML = '<p class="error-message">Erro de autenticação.</p>';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/anotacoes/paciente/${patientId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const results = await response.json();
        
        notesListContainer.innerHTML = ''; 

        if (response.ok && results.length > 0) {
            // Filtra o histórico para não incluir a anotação da sessão atual (que já está sendo exibida no topo)
            const historicalNotes = results.filter(note => note.id_anotacao !== currentSessionNoteId);
            
            if (historicalNotes.length > 0) {
                historicalNotes.forEach(note => {
                    const card = renderHistoryNoteCard(note);
                    notesListContainer.appendChild(card);
                });
            } else {
                 notesListContainer.innerHTML = '<p class="no-data-message">Não há anotações anteriores para este paciente.</p>';
            }

        } else {
             notesListContainer.innerHTML = '<p class="no-data-message">Não há anotações anteriores para este paciente.</p>';
        }

    } catch (error) {
        console.error('Erro de rede ao carregar histórico de anotações:', error);
        notesListContainer.innerHTML = '<p class="error-message">Erro de conexão ao servidor ao buscar histórico.</p>';
    }
}


// =================================================================
// LÓGICA DE CARREGAMENTO DE DETALHES DA CONSULTA
// =================================================================

// Função para renderizar os botões de Aceitar/Recusar
function renderPendingActions(consultaId) {
    const consultationContent = document.getElementById('consultation-content');
    
    // Cria o container para os botões de ação pendente
    const actionContainer = document.createElement('div');
    actionContainer.id = 'pending-actions-container';
    actionContainer.className = 'stopwatch-container'; // Reutilizando a classe de estilo para botões grandes

    actionContainer.innerHTML = `
        <p style="color: #f1eee4; font-weight: 600;">Aguardando sua ação para iniciar a sessão.</p>
        <div class="stopwatch-actions">
            <button id="accept-btn" class="start-stop-btn start-btn" style="min-width: 120px;">Aceitar</button>
            <button id="reject-btn" class="start-stop-btn stop-btn" style="background-color: #8260d1; min-width: 120px;">Recusar</button>
        </div>
    `;

    // Insere o container APÓS o consultation-header
    consultationContent.insertBefore(actionContainer, consultationContent.children[1]);

    // Adiciona Listeners
    document.getElementById('accept-btn').addEventListener('click', () => {
        handleConsultationAction(consultaId, 'accept');
    });

    document.getElementById('reject-btn').addEventListener('click', () => {
        const motive = prompt("Por favor, insira o motivo da recusa:");
        if (motive !== null && motive.trim() !== '') {
            handleConsultationAction(consultaId, 'reject', motive);
        } else if (motive !== null) {
            alert('O motivo da recusa não pode ser vazio.');
        }
    });
}

// Handler para aceitar/recusar consultas
async function handleConsultationAction(consultaId, action, motive = null) {
    const token = localStorage.getItem('jwt');
    const status = action === 'accept' ? 'aceita' : 'recusada';

    const acceptBtn = document.getElementById('accept-btn');
    const rejectBtn = document.getElementById('reject-btn');
    if (acceptBtn) acceptBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/consultas/${consultaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: status, motivo_recusa: motive })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Solicitação ${status === 'aceita' ? 'aceita' : 'recusada'} com sucesso!`);
            // Recarrega a página para atualizar o status e a UI (agora mostrando o cronômetro se aceita)
            window.location.reload(); 
        } else {
            alert(`Falha ao processar ação: ${result.error || response.statusText}`);
            console.error('Erro ao processar ação da consulta:', result);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao servidor ao processar solicitação.');
    } finally {
        if (acceptBtn) acceptBtn.disabled = false;
        if (rejectBtn) rejectBtn.disabled = false;
    }
}


async function loadConsultationDetails(consultaId) {
    const token = localStorage.getItem('jwt');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const consultationContent = document.getElementById('consultation-content');
    const notesSection = document.getElementById('notes-section');
    const stopwatchContainer = document.getElementById('stopwatch-container');
    
    const durationP = document.getElementById('consultation-duration-p');
    durationP.style.display = 'none'; 

    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    consultationContent.style.display = 'none';

    if (!token) {
        errorMessage.textContent = 'Sessão expirada. Por favor, faça login novamente.';
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }
    
    // Obter o perfil do usuário logado (armazenado em login.js)
    try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            isPsychologist = user.is_psicologo;
        }
    } catch(e) {
        console.error("Erro ao ler perfil do usuário:", e);
    }
    
    notesSection.style.display = 'none';
    stopwatchContainer.style.display = 'none'; 
    // Remove o container de ações pendentes se ele existir
    const existingPendingActions = document.getElementById('pending-actions-container');
    if (existingPendingActions) existingPendingActions.remove();

    try {
        // 1. Busca os detalhes da consulta
        const response = await fetch(`${BACKEND_URL}/consultas/${consultaId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const details = await response.json();

        if (response.ok) {
            // 2. Preenche os detalhes da consulta
            const formattedDate = formatDateTime(details.data_solicitada);
            const statusDisplay = getStatusDisplay(details.status);
            const statusClass = getStatusClass(details.status);
            
            currentConsultationId = details.id_solicitacao; 

            document.getElementById('consultation-title').textContent = `Consulta com ${details.nome_paciente}`;
            document.getElementById('consultation-id').textContent = details.id_solicitacao;
            document.getElementById('consultation-datetime').textContent = formattedDate;
            document.getElementById('consultation-motive').textContent = details.motivo || 'N/A';
            document.getElementById('consultation-patient-name').textContent = details.nome_paciente || 'N/A';
            document.getElementById('consultation-psychologist-name').textContent = details.nome_psicologo || 'N/A';
            
            const statusBadge = document.getElementById('consultation-status');
            statusBadge.textContent = statusDisplay;
            statusBadge.className = `status-badge ${statusClass}`;
            
            // Lógica de Duração
            const durationMs = details.duracao_ms;
            if (details.status === 'confirmada' && durationMs && durationMs > 0) {
                 document.getElementById('consultation-duration').textContent = formatTime(durationMs);
                 durationP.style.display = 'block';
            }
            
            // Lógica de recusa
            const rejectionP = document.getElementById('rejection-reason-p');
            if (details.status === 'recusada' && details.motivo_recusa) {
                document.getElementById('rejection-reason').textContent = details.motivo_recusa;
                rejectionP.style.display = 'block';
            } else {
                rejectionP.style.display = 'none';
            }
            
            consultationContent.style.display = 'block';

            // 3. Lógica de UI CONDICIONAL (Psicólogo)
            if (isPsychologist && details.id_paciente) {
                currentPatientId = details.id_paciente;
                const isPending = details.status === 'pendente';
                const isScheduled = details.status === 'aceita';
                const isFinished = details.status === 'confirmada';

                if (isPending) {
                    // Estado Pendente: Mostra botões de Ação
                    renderPendingActions(currentConsultationId);
                    notesSection.style.display = 'none';
                } else if (isScheduled || isFinished) {
                    // Estado Aceito/Confirmado: Mostra Cronômetro e Anotações
                    notesSection.style.display = 'block';
                    
                    // 3.1 Gerenciamento da Anotação de Sessão e Histórico
                    await loadSessionNote(currentConsultationId);
                    await loadPatientHistoryNotes(currentPatientId);

                    // 3.2 Cronômetro: Apenas se NÃO estiver confirmada
                    if (!isFinished) {
                         stopwatchContainer.style.display = 'flex'; 
                         initializeStopwatchListeners(consultaId);
                    } else {
                        stopwatchContainer.style.display = 'none';
                    }
                } else {
                     // Caso Recusada: Não mostra cronômetro nem notas
                    stopwatchContainer.style.display = 'none';
                    notesSection.style.display = 'none';
                }

            }

        } else {
            console.error('Erro ao carregar detalhes da consulta:', details.error);
            errorMessage.textContent = `Erro ao carregar consulta: ${details.error || response.statusText}`;
            errorMessage.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro de rede:', error);
        errorMessage.textContent = 'Erro de conexão com o servidor ao buscar detalhes da consulta.';
        errorMessage.style.display = 'block';

    } finally {
        loadingMessage.style.display = 'none';
    }
}


// =================================================================
// INICIALIZAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    const params = getQueryParams();
    const consultaId = params.consultaId;

    if (consultaId) {
        loadConsultationDetails(consultaId);
    } else {
        document.getElementById('error-message').textContent = 'ID da consulta não fornecido na URL.';
        document.getElementById('error-message').style.display = 'block';
    }
});