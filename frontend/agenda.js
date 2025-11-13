// ARQUIVO: frontend/agenda.js (COMPLETO E FINAL)

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    
    // Elementos do Modal de Agendamento
    var modalContainer = document.getElementById('modal-container'); 
    var viewModalContainer = document.getElementById('view-appointment-modal-container'); 
    
    var eventDateInput = document.getElementById('event-date');
    var eventMotivationTextarea = document.getElementById('event-motivation');
    var eventTimeInput = document.getElementById('event-time');
    var doctorSelect = document.getElementById('doctor-select'); 
    var createBtnModal = document.getElementById('create-btn-modal');
    var closeBtns = document.querySelectorAll('#modal-container .modal-footer button, #modal-container .modal-header button'); 
  
    // Seletores do Modal de Visualização
    var viewTitle = document.getElementById('view-title');
    var viewDate = document.getElementById('view-date');
    var viewTime = document.getElementById('view-time');
    var viewDoctor = document.getElementById('view-doctor');
    var viewStatus = document.getElementById('view-status');
    var closeViewModalBtn = document.getElementById('close-view-modal-btn');
    var closeBtnViewModal = document.getElementById('close-btn-view-modal');
  
    
    // Garante que o modal de visualização esteja fechado no início
    if (viewModalContainer) {
        viewModalContainer.classList.remove('active');
        viewModalContainer.style.display = 'none'; 
    }
  
    const BACKEND_URL = 'http://localhost:3000'; // URL do Backend
    

    // =========================================================================
    // FUNÇÕES AUXILIARES: Obtém perfil, parâmetros, formata data/hora
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
            psyName: params.get('psyName') ? decodeURIComponent(params.get('psyName')) : null,
            openModal: params.get('openModal') === 'true'
        };
    }
  
    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
  
    function formatEventTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // =========================================================================
    // FUNÇÃO PRINCIPAL: Buscar psicólogos e preencher/pré-selecionar o select
    // =========================================================================
    async function fetchPsychologistsAndPopulateSelect() {
        const params = getUrlParams();
        
        if (!doctorSelect) return;

        try {
            // 1. Faz a requisição para obter a lista de psicólogos
            const response = await fetch(`${BACKEND_URL}/psychologists`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const psychologists = await response.json();
                
                // 2. Limpa o select e adiciona o placeholder inicial
                doctorSelect.innerHTML = '<option value="">Selecione um profissional</option>';

                // 3. Adiciona todos os psicólogos ao select
                if (psychologists.length > 0) {
                    psychologists.forEach(psy => {
                        const option = document.createElement('option');
                        option.value = psy.id_usuario;
                        option.textContent = psy.nome;
                        doctorSelect.appendChild(option);
                    });
                } else {
                    console.warn('Nenhum psicólogo ativo encontrado no banco de dados.');
                    doctorSelect.innerHTML += '<option value="" disabled>Nenhum profissional disponível</option>';
                }
                
                // 4. Aplica a lógica de pré-preenchimento e abertura do modal
                prefillModal(params.psyId, params.psyName, params.openModal);
                
            } else {
                const result = await response.json();
                console.error('Erro ao buscar psicólogos:', result.error);
                doctorSelect.innerHTML = '<option value="">Erro ao carregar lista de psicólogos</option>';
            }

        } catch (error) {
            console.error('Erro de rede ao buscar psicólogos:', error);
            doctorSelect.innerHTML = '<option value="">Erro de conexão com o servidor</option>';
        }
    }
  
    // 2. Lógica para pré-preencher e abrir o modal
    function prefillModal(psyId, psyName, openModal) {
        let isPreSelected = false;
        
        if (eventDateInput) {
             eventDateInput.removeAttribute('readonly');
        }
        
        // 1. Tenta pré-selecionar o profissional
        if (psyId && doctorSelect) {
            for (let i = 0; i < doctorSelect.options.length; i++) {
                // Compara o valor do ID (value), garantindo que o valor seja o ID do psicólogo
                if (doctorSelect.options[i].value == psyId) {
                    doctorSelect.options[i].selected = true;
                    isPreSelected = true;
                    break;
                }
            }
        }
        
        // 2. Se o parâmetro 'openModal=true' estiver presente E o profissional foi pré-selecionado (ou já estava na lista)
        if (openModal && isPreSelected) {
            // Limpa os parâmetros de agendamento da URL após usá-los
            const url = new URL(window.location);
            url.searchParams.delete('psyId');
            url.searchParams.delete('psyName');
            url.searchParams.delete('openModal');
            window.history.replaceState({}, '', url);

            if (eventDateInput) {
                eventDateInput.value = getTodayDateString(); 
            }
            if (modalContainer) {
                modalContainer.classList.add('active'); 
            }
            if (eventMotivationTextarea) {
                 eventMotivationTextarea.focus();
            }
        }
    }
    
    // =========================================================================
    // Função para buscar eventos do backend (FullCalendar)
    // =========================================================================
    async function fetchAppointments(info, successCallback, failureCallback) {
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
                if (failureCallback) failureCallback();
            }
  
        } catch (error) {
            console.error('Erro de rede ao buscar eventos:', error);
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
        
        // Garante que o select não esteja vazio se o usuário clicar na data
        if (doctorSelect.options.length === 0 || doctorSelect.options[0].value === '') {
             // Chama a função para tentar recarregar a lista caso esteja vazia
             fetchPsychologistsAndPopulateSelect();
        }
        
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
  
  
    // 6. Lógica de agendamento
    if (createBtnModal) {
        createBtnModal.addEventListener('click', async function() {
          var motivation = eventMotivationTextarea.value;
          var date = eventDateInput.value;
          var time = eventTimeInput.value;
          var selectedPsyId = doctorSelect.value;
          // O nome do psicólogo é opcional, mas útil para logs/mensagens
          var selectedPsyName = doctorSelect.options[doctorSelect.selectedIndex].text; 
  
          if (motivation && date && time && selectedPsyId) {
            
            const token = localStorage.getItem('jwt');
  
            if (!token) {
                return alert('Erro de autenticação: Usuário não logado ou token ausente. Por favor, faça login.');
            }
  
            const appointmentData = {
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
  
  
    // 7. Lógica para fechar o modal de AGENDAMENTO
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
    
    // 8. Inicialização: Carregar psicólogos e, em seguida, pré-preencher o modal
    fetchPsychologistsAndPopulateSelect();
});