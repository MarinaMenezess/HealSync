// ARQUIVO: frontend/psy-profile.js (FINAL COM MODAL DE AVALIAÇÃO E LÓGICA DE EXIBIÇÃO DE REVIEWS)

// Certifique-se que o BACKEND_URL está definido em script.js ou aqui
// const BACKEND_URL = 'http://localhost:3000'; // Exemplo, deve estar em um arquivo global (script.js)

// Função auxiliar para formatar a data de nascimento
function formatBirthDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Função para calcular a idade (mantida, mas não usada nesta página específica)
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
    // Arredonda para o inteiro mais próximo para preencher a estrela
    const roundedRating = Math.round(rating); 
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            // Assumindo a classe 'star-filled' para estrelas preenchidas para estilização (cor amarela)
            stars += `<span class="star-filled">${fullStar}</span>`;
        } else {
            // Assumindo a classe 'star-empty' para estrelas vazias (cor cinza)
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
    
    // Obter elementos para manipulação
    const profileName = document.getElementById('psy-name');
    const profileSpecialty = document.getElementById('psy-specialty');
    const profileBio = document.getElementById('psy-bio-text');
    const profileContact = document.getElementById('psy-contact');
    const avatarImg = document.getElementById('psy-avatar');
    const rateBtn = document.getElementById('rate-button');
    const scheduleBtn = document.getElementById('schedule-button'); 
    
    // Novos elementos para avaliação
    const reviewsContent = document.getElementById('reviews-content');
    const avgRatingElement = document.getElementById('psy-avg-rating-stars');
    const totalReviewsCount = document.getElementById('total-reviews-count');
    const noReviewsMessage = document.getElementById('no-reviews-message');

    if (!psychologistId || !token) {
        if (profileName) profileName.textContent = 'Erro: ID ou Token ausente.';
        return;
    }

    try {
        // -------------------------------------------------------------------------
        // 1. FETCH: Obter dados do perfil (inclui a nota média)
        // -------------------------------------------------------------------------
        const profileResponse = await fetch(`${BACKEND_URL}/users/${psychologistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const profileData = await profileResponse.json();

        if (profileResponse.ok && profileData.is_psicologo === 1) {
            
            // Preenche os dados básicos
            if (profileName) profileName.textContent = profileData.nome || 'Nome não disponível';
            if (profileSpecialty) profileSpecialty.textContent = profileData.especialidade || 'Não especificado';
            if (profileBio) profileBio.textContent = profileData.bio || 'Sem descrição biográfica.';
            if (profileContact) profileContact.textContent = profileData.contato || 'N/A';
            if (avatarImg) avatarImg.src = profileData.foto_perfil_url || '../assets/user-default.svg';
            
            // Configurações de botões
            if (scheduleBtn) {
                 scheduleBtn.onclick = () => window.location.href = `agenda.html?psychologistId=${psychologistId}`;
            }
            if (rateBtn) {
                 rateBtn.style.display = 'block'; 
                 rateBtn.onclick = () => {
                     createRatingModal(psychologistId, profileData.nome);
                 };
            }
            
            // -------------------------------------------------------------------------
            // 2. FETCH: Obter avaliações detalhadas (Nova Rota)
            // -------------------------------------------------------------------------
            const reviewsResponse = await fetch(`${BACKEND_URL}/ratings/${psychologistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const reviewsData = await reviewsResponse.json();

            // -------------------------------------------------------------------------
            // 3. EXIBIÇÃO DA NOTA MÉDIA E LISTA DE REVIEWS
            // -------------------------------------------------------------------------

            // 3.1 Exibir a nota média (já disponível em profileData.avaliacao)
            const avgRatingValue = profileData.avaliacao || 0;
            
            if (avgRatingElement) {
                // toFixed(1) para garantir uma casa decimal (ex: 4.0)
                avgRatingElement.innerHTML = renderRatingStars(avgRatingValue) + ` ${parseFloat(avgRatingValue).toFixed(1)}`;
            }

            if (reviewsResponse.ok && Array.isArray(reviewsData) && reviewsData.length > 0) {
                // a. Atualizar a contagem total de avaliações
                const reviewCount = reviewsData.length;
                if (totalReviewsCount) {
                    totalReviewsCount.textContent = `(${reviewCount} Avaliaç${reviewCount === 1 ? 'ão' : 'ões'})`;
                }
                
                // b. Ocultar a mensagem de "Nenhuma avaliação" e renderizar a lista
                if (reviewsContent) {
                    if (noReviewsMessage) noReviewsMessage.style.display = 'none';

                    reviewsData.forEach(review => {
                        const reviewElement = document.createElement('div');
                        reviewElement.classList.add('review-item');
                        
                        const starsHtml = renderRatingStars(review.nota);
                        const reviewDate = review.data_avaliacao ? new Date(review.data_avaliacao).toLocaleDateString('pt-BR') : '';
                        
                        reviewElement.innerHTML = `
                            <div class="review-header">
                                <p class="review-author"><strong>${review.nome_paciente || 'Usuário Anônimo'}</strong></p>
                                <div class="review-rating-date">
                                    <span class="review-stars">${starsHtml}</span>
                                    <span class="review-date">${reviewDate}</span>
                                </div>
                            </div>
                            <p class="review-text">${review.justificativa || 'O paciente não deixou um comentário.'}</p>
                            <hr style="border-top: 1px solid #ccc; margin-top: 10px; margin-bottom: 10px;"/>
                        `;
                        reviewsContent.appendChild(reviewElement);
                    });
                }

            } else {
                // Se não houver avaliações
                if (totalReviewsCount) totalReviewsCount.textContent = '(0 Avaliações)';
                if (noReviewsMessage) noReviewsMessage.style.display = 'block';
            }

        } else if (profileData.is_psicologo !== 1) {
             if (profileName) profileName.textContent = 'Perfil não encontrado ou não é um psicólogo.';
        } else {
            console.error('Erro ao carregar perfil:', profileData.error);
             if (profileName) profileName.textContent = 'Erro ao carregar perfil.';
        }

    } catch (error) {
        console.error('Erro de rede ou ao buscar dados:', error);
         if (profileName) profileName.textContent = 'Erro de conexão com o servidor.';
    } finally {
        // Lógica de finalização, se houver.
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
    
    const closeModal = () => {
        // Remove o estilo temporário do header que lida com o hover
        const starStyle = document.querySelector('style');
        if (starStyle) document.head.removeChild(starStyle);
        document.body.removeChild(modalContainer);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'rating-modal-container') closeModal();
    });
    
    form.addEventListener('submit', (e) => handleRatingSubmit(e, closeModal));

    // Estilo Hover (Para ser mais visível, definindo cores)
    // Adiciona o estilo dinâmico ao head para as estrelas
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
            // Recarregar a página para mostrar a nova avaliação e a nova média
            window.location.reload(); 
        } else if (response.status === 409) {
             alert(`Você já avaliou este profissional. Erro: ${result.error}`);
             // Fechar modal mesmo em caso de erro 409 para permitir recarregar a página
             closeModal();
             window.location.reload(); 
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