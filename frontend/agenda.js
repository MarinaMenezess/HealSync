// ARQUIVO: frontend/agenda.js (COMPLETO E CORRIGIDO)

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    
    // Elementos do Modal de Agendamento
    var modalContainer = document.getElementById('modal-container'); 
    var viewModalContainer = document.getElementById('view-appointment-modal-container'); 
    
    var eventDateInput = document.getElementById('event-date');
    // MODIFICADO: Seleciona o novo campo textarea
    var eventMotivationTextarea = document.getElementById('event-motivation');
    var eventTimeInput = document.getElementById('event-time');
    var doctorSelect = document.getElementById('doctor-select'); 
    var createBtnModal = document.getElementById('create-btn-modal');
    var closeBtns = document.querySelectorAll('#modal-container .modal-footer button, #modal-container .modal-header button'); 
  
    // Seletores do Modal de Visualização (usado pelo perfil 'paciente' ou default)
    var viewTitle = document.getElementById('view-title');
    var viewDate = document.getElementById('view-date');
    var viewTime = document.getElementById('view-time');
    var viewDoctor = document.getElementById('view-doctor');
    var viewStatus = document.getElementById('view-status');
    var closeViewModalBtn = document.getElementById('close-view-modal-btn');
    var closeBtnViewModal = document.getElementById('close-btn-view-modal');
  
    
    // CORREÇÃO: Garante que o modal de visualização esteja fechado no início
    if (viewModalContainer) {
        viewModalContainer.classList.remove('active');
        viewModalContainer.style.display = 'none'; 
    }
  
    // =========================================================================
    // FUNÇÃO AUXILIAR: Obtém o perfil do usuário
    // =========================================================================
    function getUserRole() {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                return user.is_psicologo ? 'psicologo' : 'paciente';
            } catch (e) {
                console.error("Erro ao parsear user do localStorage:", e);
                return null;
            }
        }
        return null;
    }

    // 1. Função para ler parâmetros da URL
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            psyId: params.get('psyId'),
            psyName: params.get('psyName') ? decodeURIComponent(params.get('psyName')) : null
        };
    }
  
    // Função auxiliar para formatar a data de hoje como YYYY-MM-DD
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  
    // Função auxiliar para formatar a hora de uma string de data completa
    function formatEventTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 2. Lógica para pré-preencher o modal de AGENDAMENTO
    function prefillModal(psyId, psyName) {
        let shouldOpenModal = false;
        
        if (eventDateInput) {
             eventDateInput.removeAttribute('readonly');
        }
        
        if (psyId && psyName) {
            const option = document.createElement('option');
            option.value = psyId;
            option.textContent = psyName;
            option.selected = true;
            
            if (doctorSelect) {
                doctorSelect.innerHTML = '';
                doctorSelect.appendChild(option);
            }
            
            // REMOVIDA A PRÉ-DEFINIÇÃO DO TÍTULO/MOTIVAÇÃO NO FRONTEND
            
            shouldOpenModal = true;
  
            const url = new URL(window.location);
            url.searchParams.delete('psyId');
            url.searchParams.delete('psyName');
            window.history.replaceState({}, '', url);
  
        } else if (doctorSelect) {
             doctorSelect.innerHTML = '<option value="">Selecione um profissional</option>';
        }
  
        if (shouldOpenModal) {
            if (eventDateInput) {
                eventDateInput.value = getTodayDateString(); 
            }
            if (modalContainer) {
                modalContainer.classList.add('active'); 
            }
        }
    }
    
    // =========================================================================
    // Função para buscar eventos do backend
    // =========================================================================
    async function fetchAppointments(info, successCallback, failureCallback) {
        const BACKEND_URL = 'http://localhost:3000';
        const token = localStorage.getItem('jwt'); 
  
        if (!token) {
            console.error('Token JWT não encontrado. Falha ao carregar eventos.');
            if (failureCallback) failureCallback();
            return;
        }
  
        try {
            const response = await fetch(`${BACKEND_URL}/api/agenda/eventos`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
  
            if (response.ok) {
                const events = await response.json();
                successCallback(events); 
            } else {
                const result = await response.json();
                console.error('Erro ao buscar eventos:', result.error);
                alert('Falha ao carregar eventos: ' + result.error);
                if (failureCallback) failureCallback();
            }
  
        } catch (error) {
            console.error('Erro de rede ao buscar eventos:', error);
            alert('Erro de conexão com o servidor ao carregar eventos.');
            if (failureCallback) failureCallback();
        }
    }
    
    // 3. Inicialização do calendário
    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      editable: true,
      selectable: true,
      
      events: fetchAppointments,
      
      // Ação ao clicar na data (abre modal de agendamento)
      dateClick: function(info) {
        if (eventDateInput) {
            eventDateInput.value = info.dateStr; 
        }
        if (modalContainer) {
            modalContainer.classList.add('active');
        }
        
        if (doctorSelect.options.length === 0 || doctorSelect.options[0].value === '') {
             doctorSelect.innerHTML = '<option value="">Selecione um profissional</option>';
        }
        
        // Foca no novo campo de motivação
        if (eventMotivationTextarea) {
            eventMotivationTextarea.focus();
        }
      },
      
      // AÇÃO AO CLICAR EM UM EVENTO (condicional por perfil)
      eventClick: function(info) {
          info.jsEvent.preventDefault();
  
          const userRole = getUserRole(); // Verifica o perfil
          const event = info.event;
          const consultaId = event.id; // Assumimos que o ID do evento é o ID da consulta.
  
          if (userRole === 'psicologo' && consultaId) {
              // SE PSICÓLOGO: Redireciona para a página de registro de consulta
              window.location.href = `consulta.html?id=${consultaId}`;
          } else {
              // SE PACIENTE ou default: Abre o modal de visualização (comportamento original)
              
              const extendedProps = event.extendedProps;
              
              const startDateTime = event.start;
              const eventDate = startDateTime.toLocaleDateString('pt-BR');
              const eventTime = formatEventTime(startDateTime);
      
              // Preenche o modal de visualização
              if (viewTitle) viewTitle.textContent = event.title; // O título agora contém a motivação + nome do profissional
              if (viewDate) viewDate.textContent = eventDate;
              if (viewTime) viewTime.textContent = eventTime;
              if (viewDoctor) viewDoctor.textContent = extendedProps.contactName || 'Não informado'; 
              if (viewStatus) viewStatus.textContent = extendedProps.status || 'Pendente';
              
              // Abre o modal de visualização
              if (viewModalContainer) {
                  viewModalContainer.classList.add('active');
                  viewModalContainer.style.display = 'flex';
              }
          }
      }
    });
  
    // Torna o calendário global para que consultas.js possa chamá-lo
    window.calendar = calendar;
    calendar.render();
    
    // 4. Lógica de fechar o modal de VISUALIZAÇÃO
    function closeViewModal() {
        if (viewModalContainer) {
            viewModalContainer.classList.remove('active');
            viewModalContainer.style.display = 'none'; 
        }
    }
    
    if (closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', closeViewModal);
    }
    if (closeBtnViewModal) {
        closeBtnViewModal.addEventListener('click', closeViewModal);
    }
    if (viewModalContainer) {
        viewModalContainer.addEventListener('click', function(e) {
          if (e.target === viewModalContainer) {
            closeViewModal();
          }
        });
    }
  
    // 5. Lógica para interagir com o campo de data (mantida)
    if (eventDateInput) {
        eventDateInput.addEventListener('click', function() {
            if (modalContainer) {
                modalContainer.classList.remove('active');
            }
            
            if (eventDateInput.value) {
                calendar.gotoDate(eventDateInput.value);
            }
            
            alert('Selecione a nova data no calendário principal para continuar.');
        });
    }
  
  
    // 6. Lógica de agendamento (MODIFICADA para usar motivation)
    if (createBtnModal) {
        createBtnModal.addEventListener('click', async function() {
          // MODIFICADO: Pega o valor da textarea e usa 'motivation'
          var motivation = eventMotivationTextarea.value;
          var date = eventDateInput.value;
          var time = eventTimeInput.value;
          var selectedPsyId = doctorSelect.value;
          var selectedPsyName = doctorSelect.options[doctorSelect.selectedIndex].text;
  
          // MODIFICADO: Validação usa 'motivation'
          if (motivation && date && time && selectedPsyId) {
            
            const BACKEND_URL = 'http://localhost:3000'; 
            const token = localStorage.getItem('jwt');
  
            if (!token) {
                return alert('Erro de autenticação: Usuário não logado ou token ausente. Por favor, faça login.');
            }
  
            const appointmentData = {
                // IMPORTANTE: O backend espera o campo 'titulo', que agora contém a motivação
                titulo: motivation,
                data: date,
                hora: time,
                id_psicologo: selectedPsyId,
                nome_psicologo: selectedPsyName
            };
  
            try {
                const response = await fetch(`${BACKEND_URL}/api/agenda/agendar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(appointmentData)
                });
  
                const result = await response.json();
  
                if (response.ok) {
                    calendar.refetchEvents();
                    
                    // Limpa os campos
                    eventMotivationTextarea.value = '';
                    eventTimeInput.value = '';
                    if (modalContainer) {
                        modalContainer.classList.remove('active');
                    }
                    
                    const protocolMessage = result.insertId ? `Protocolo: ${result.insertId}` : '';
                    alert(`Solicitação de agendamento enviada com sucesso! ${protocolMessage} Status: Pendente.`);
                } else if (response.status === 401) {
                    alert('Erro de Autorização (401): Seu token expirou ou é inválido. Por favor, faça login novamente.');
                } else {
                    alert(`Falha ao agendar: ${result.error || response.statusText}. Verifique se o backend está ativo.`);
                }
  
            } catch (error) {
                console.error('Erro de rede ao agendar:', error);
                alert('Erro de conexão com o servidor. Verifique se o backend está ativo em http://localhost:3000.');
            }
          } else {
             alert('Por favor, preencha todos os campos.');
          }
        });
    }
  
  
    // 7. Lógica para fechar o modal de AGENDAMENTO (mantida)
    closeBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        if (modalContainer) {
            modalContainer.classList.remove('active');
        }
      });
    });
  
    if (modalContainer) {
        modalContainer.addEventListener('click', function(e) {
          if (e.target === modalContainer) {
            modalContainer.classList.remove('active');
          }
        });
    }
    
    // 8. Executa a função de pré-preenchimento na inicialização da página
    const params = getUrlParams();
    prefillModal(params.psyId, params.psyName);
});