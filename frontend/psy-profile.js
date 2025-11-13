// ARQUIVO: frontend/psy-profile.js (FINAL COM MODAL DE AVALIAÇÃO E CHECAGENS DE NULL)

// Função auxiliar para formatar a data de nascimento
function formatBirthDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Função para calcular a idade
function calculateAge(dateString) {
    if (!dateString) return 'N/A';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Função para renderizar as estrelas de avaliação
function renderRatingStars(rating) {
    const fullStar = '&#9733;';
    const emptyStar = '&#9734;';
    const roundedRating = Math.round(rating);
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            stars += `<span class="star-filled">${fullStar}</span>`;
        } else {
            stars += `<span class="star-empty">${emptyStar}</span>`;
        }
    }
    return stars;
}


// Função principal para carregar o perfil do psicólogo
async function loadPsychologistProfile() {
    const params = new URLSearchParams(window.location.search);
    const psychologistId = params.get('id');
    const token = localStorage.getItem('jwt');
    
    // Obter elementos com checagem de null para evitar o TypeError
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const profileContainer = document.getElementById('psychologist-profile-container');

    // Aplica estilo apenas se o elemento existir
    if (loadingMessage) loadingMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'none';

    if (!psychologistId) {
        if (errorMessage) {
            errorMessage.textContent = 'ID do psicólogo não fornecido na URL.';
            errorMessage.style.display = 'block';
        }
        if (loadingMessage) loadingMessage.style.display = 'none';
        return;
    }

    if (!token) {
        if (errorMessage) {
            errorMessage.textContent = 'Você precisa estar logado para ver este perfil.';
            errorMessage.style.display = 'block';
        }
        if (loadingMessage) loadingMessage.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/users/${psychologistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.is_psicologo === 1) {
            // Preenche os dados do perfil, usando checagem de null antes de manipular o DOM
            const profileName = document.getElementById('profile-name');
            if (profileName) profileName.textContent = data.nome;

            const profileSpecialty = document.getElementById('profile-specialty');
            if (profileSpecialty) profileSpecialty.textContent = data.especialidade || 'Não especificado';

            const profileBio = document.getElementById('profile-bio');
            if (profileBio) profileBio.textContent = data.bio || 'Sem descrição biográfica.';

            const profileContact = document.getElementById('profile-contact');
            if (profileContact) profileContact.textContent = data.contato || 'N/A';

            const profileCfp = document.getElementById('profile-cfp');
            if (profileCfp) profileCfp.textContent = data.cfp || 'N/A';
            
            // Lógica de avaliação
            const ratingValue = data.avaliacao || 0;
            const profileRating = document.getElementById('profile-rating');
            if (profileRating) profileRating.innerHTML = renderRatingStars(ratingValue) + ` (${ratingValue})`;
            
            // Lógica de agendamento (Botão Flutuante)
            const scheduleBtn = document.getElementById('schedule-consultation-btn');
            if (scheduleBtn) {
                 scheduleBtn.onclick = () => window.location.href = `agenda.html?psychologistId=${psychologistId}`;
            }

            // Lógica de Avaliação (Botão fixo)
            const rateBtn = document.getElementById('rate-psychologist-btn');
            if (rateBtn) {
                 rateBtn.style.display = 'block'; // Mostra o botão
                 rateBtn.onclick = () => {
                     // Chama o modal
                     createRatingModal(psychologistId, data.nome);
                 };
            }


            // Atualiza a foto de perfil
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg) {
                avatarImg.src = data.foto_perfil_url || '../assets/user-default.svg';
            }
            
            if (profileContainer) profileContainer.style.display = 'block';

        } else if (data.is_psicologo !== 1) {
             if (errorMessage) {
                 errorMessage.textContent = 'Este perfil não é de um psicólogo ativo.';
                 errorMessage.style.display = 'block';
             }
        } else {
            console.error('Erro ao carregar perfil:', data.error);
            if (errorMessage) {
                errorMessage.textContent = `Erro ao carregar perfil: ${data.error || response.statusText}`;
                errorMessage.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('Erro de rede:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Erro de conexão com o servidor ao buscar perfil.';
            errorMessage.style.display = 'block';
        }

    } finally {
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
}

// =========================================================================
// LÓGICA DO MODAL DE AVALIAÇÃO (RATING)
// =========================================================================

function createRatingModal(psychologistId, psychName) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'rating-modal-container';
    modalContainer.classList.add('modal-container', 'active');
    
    // HTML para o sistema de estrelas
    const starRatingHTML = `
        <div class="star-rating" data-rating="0">
            <span class="star" data-value="1">&#9733;</span>
            <span class="star" data-value="2">&#9733;</span>
            <span class="star" data-value="3">&#9733;</span>
            <span class="star" data-value="4">&#9733;</span>
            <span class="star" data-value="5">&#9733;</span>
        </div>
    `;

    modalContainer.innerHTML = `
      <div id="rating-modal" class="modal">
        <div class="modal-header">
          <h1 class="modal-title">Avaliar ${psychName}</h1>
          <button id="close-rating-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form id="rating-form">
            <input type="hidden" id="psychologist-id-input" value="${psychologistId}">
            
            <div class="form-group" style="text-align: center; margin-bottom: 20px;">
              <label>Sua Nota (1 a 5):</label>
              ${starRatingHTML}
              <input type="hidden" id="rating-value" name="nota" value="0" required>
            </div>
            
            <div class="form-group">
              <label for="rating-justification">Justificativa (Opcional)</label>
              <textarea id="rating-justification" name="justificativa" rows="4" placeholder="Descreva sua experiência."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="cancel-rating-btn">Cancelar</button>
          <button id="submit-rating-btn" type="submit" form="rating-form" class="save-button">Enviar Avaliação</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);
    
    const ratingContainer = modalContainer.querySelector('.star-rating');
    const ratingInput = modalContainer.querySelector('#rating-value');
    
    // Adiciona evento para selecionar as estrelas
    ratingContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const value = e.target.getAttribute('data-value');
            ratingInput.value = value;
            ratingContainer.setAttribute('data-rating', value);
            
            ratingContainer.querySelectorAll('.star').forEach(star => {
                const starValue = star.getAttribute('data-value');
                star.style.color = starValue <= value ? '#FFD700' : '#888';
            });
        }
    });

    // Adiciona eventos do modal
    const closeBtn = document.getElementById('close-rating-modal-btn');
    const cancelBtn = document.getElementById('cancel-rating-btn');
    const form = document.getElementById('rating-form');
    
    const closeModal = () => document.body.removeChild(modalContainer);

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'rating-modal-container') closeModal();
    });
    
    form.addEventListener('submit', (e) => handleRatingSubmit(e, closeModal));

    // Estilo Hover (Para ser mais visível, definindo cores)
    const starStyle = document.createElement('style');
    starStyle.textContent = `
        #rating-modal .star-rating .star {
            font-size: 2em;
            color: #888;
            transition: color 0.2s;
            cursor: pointer;
        }
        #rating-modal .star-rating .star:hover {
            color: #FFEB3B !important;
        }
    `;
    document.head.appendChild(starStyle);

    // Lógica de hover e mouseout
    ratingContainer.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('star')) {
            const hoverValue = e.target.getAttribute('data-value');
            ratingContainer.querySelectorAll('.star').forEach(s => {
                s.style.color = s.getAttribute('data-value') <= hoverValue ? '#FFEB3B' : '#888';
            });
        }
    });

    ratingContainer.addEventListener('mouseout', () => {
        const currentValue = ratingInput.value;
        ratingContainer.querySelectorAll('.star').forEach(s => {
            s.style.color = s.getAttribute('data-value') <= currentValue ? '#FFD700' : '#888';
        });
    });

    // Inicializa as estrelas para o valor atual (0)
    ratingContainer.dispatchEvent(new Event('mouseout')); 
}

// Função de envio de dados para o backend
async function handleRatingSubmit(e, closeModal) {
    e.preventDefault();
    const token = localStorage.getItem('jwt');
    
    const psychologistId = document.getElementById('psychologist-id-input').value;
    const nota = document.getElementById('rating-value').value;
    const justificativa = document.getElementById('rating-justification').value;
    const submitBtn = document.getElementById('submit-rating-btn');
    
    if (nota == 0) {
        alert('Por favor, selecione uma nota de 1 a 5.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const ratingData = {
        id_psicologo: parseInt(psychologistId, 10),
        nota: parseInt(nota, 10),
        justificativa: justificativa.trim()
    };

    try {
        const response = await fetch(`${BACKEND_URL}/ratings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ratingData),
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Avaliação enviada com sucesso! Nova média: ${result.nova_media}`);
            closeModal();
            // Recarregar a página para mostrar a nova avaliação
            window.location.reload(); 
        } else if (response.status === 409) {
             alert(`Você já avaliou este profissional. Erro: ${result.error}`);
        } else {
            alert(`Falha ao enviar avaliação: ${result.error || response.statusText}`);
            console.error('Erro ao enviar avaliação:', result.error);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão com o servidor ao enviar avaliação.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Avaliação';
    }
}


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o carregamento do perfil
    loadPsychologistProfile();
});