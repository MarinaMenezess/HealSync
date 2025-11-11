// marinamenezess/healsync/HealSync-8ad206e020d766a7f9316c305e30cea2c9eaf9c4/frontend/index.js (MODIFICADO)

const BACKEND_URL = 'http://localhost:3000';
const DEFAULT_AVATAR_URL = '../assets/user-default.svg'; // Definindo o default para posts

// Função auxiliar para obter o ID do usuário logado do localStorage
function getLoggedInUserId() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const userData = JSON.parse(userJson);
            // Pega o ID e o força a ser um Number.
            const userId = Number(userData.id_usuario); 
            
            if (!isNaN(userId) && userId > 0) {
                return userId;
            }
        } catch (e) {
            console.error("Erro ao parsear usuário do localStorage:", e);
        }
    }
    return null;
}

// Função auxiliar para formatar a data como "há X tempo"
function formatTimeAgo(dateString) {
    if (!dateString) return "Data inválida";
    const now = new Date();
    const past = new Date(dateString.replace(' ', 'T')); 
    if (isNaN(past)) return "Data inválida";
    
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return "há poucos segundos";
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `há ${days} dia${days > 1 ? 's' : ''}`;
    }
}

// NOVA FUNÇÃO: Arquivar um post (seta is_public = 0)
async function archivePost(registerId) {
    const token = localStorage.getItem('jwt');
    if (!token) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        return;
    }
    if (!confirm('Tem certeza que deseja arquivar este post e removê-lo da timeline pública?')) {
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/registros/${registerId}/archive`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.mensagem);
            loadPublicPosts(); // Recarrega a timeline
        } else {
            alert(`Falha ao arquivar post: ${result.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Erro de rede ao arquivar o post:', error);
        alert('Erro de conexão ao arquivar o post.');
    }
}

// NOVA FUNÇÃO: Denunciar um post (INCLUI LÓGICA DE INATIVAÇÃO LOCAL)
async function denouncePost(registerId, authorId) {
    const token = localStorage.getItem('jwt');
    const currentUserId = getLoggedInUserId();

    if (!token) {
        alert('Você precisa estar logado para denunciar um registro.');
        return;
    }
    
    if (!confirm(`Atenção: A denúncia irá arquivar o post ID ${registerId} e sinalizá-lo. Deseja continuar?`)) {
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/registros/${registerId}/denounce`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.mensagem);

            // Verifica se a mensagem de inativação foi retornada pelo backend
            if (result.mensagem && result.mensagem.includes('foi inativado para postagens e comentários')) {
                // Se o backend inativou o autor do post, limpamos o estado local
                if (currentUserId === Number(authorId)) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('jwt');
                    alert('Sua conta foi inativada. Você será desconectado. Por favor, faça login novamente para confirmar o novo status.');
                    window.location.reload(); 
                    return; 
                }
            }

            loadPublicPosts(); // Recarrega a timeline para remover o post denunciado
        } else {
            // Tenta ler o erro como JSON primeiro
            try {
                const errorResult = await response.json();
                alert(`Falha ao denunciar post (${response.status}): ${errorResult.error || errorResult.mensagem || response.statusText}`);
            } catch (e) {
                // Trata respostas não-JSON (como HTML de erro 404/500)
                alert(`Falha ao denunciar post (Erro ${response.status}). Verifique o console para detalhes.`);
            }
        }
    } catch (error) {
        console.error('Erro de rede ao denunciar o post:', error);
        alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
    }
}


// Renderiza um cartão de post (Post Card)
function renderPostCard(post) {
    const postElement = document.createElement('div');
    postElement.classList.add('post-card');
    
    const timeAgo = formatTimeAgo(post.data);
    const emotionTitle = post.emocao ? post.emocao.toUpperCase() : 'REGISTRO';
    
    const currentUserId = getLoggedInUserId(); 
    const postAuthorId = Number(post.id_autor || 0);
    const isAuthor = currentUserId !== null && currentUserId === postAuthorId;
    const isDenounced = post.is_denounced == 1 || post.is_denounced === true; 
    
    // NOVO: Define a URL do avatar com fallback para a URL default
    const avatarUrl = post.foto_perfil_url || DEFAULT_AVATAR_URL;


    // REDIRECIONAMENTO AO CLICAR NO CARD:
    postElement.addEventListener('click', () => {
         window.location.href = `./register.html?id=${post.id_registro}`;
    });


    // Lógica para os botões do canto superior direito
    let topButtonsHTML = ``;
    
    // 1. Sinalização DENUNCIADO
    if (isDenounced) {
        topButtonsHTML = `<span style="color: #dc3545; font-weight: bold; padding: 4px 8px; border: 1px solid #dc3545; border-radius: 4px; background-color: #3b1b1b;">DENUNCIADO</span>`;
    }
    // 2. Botão de Arquivar (visível APENAS para o autor)
    else if (isAuthor) { 
        // Usamos event.stopPropagation() para que este clique não ative o listener do card
        topButtonsHTML = `
            <button class="action-btn archive-btn" title="Arquivar Post" onclick="event.stopPropagation(); archivePost(${post.id_registro})">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#f1eee4" class="bi bi-archive" viewBox="0 0 16 16">
  <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5zm13-3H1v2h14zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>
</svg>
            </button>`;
    } 
    
    // 3. Botão de Denunciar (visível se o usuário estiver logado E NÃO for o autor)
    else if (currentUserId !== null) { 
         // Usamos event.stopPropagation() para que este clique não ative o listener do card
         topButtonsHTML += `
            <button class="action-btn denounce-btn" title="Denunciar" onclick="event.stopPropagation(); denouncePost(${post.id_registro}, ${post.id_autor})">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#f1eee4" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
  <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
  <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
</svg>
            </button>`;
    }


    postElement.innerHTML += `
      <div class="post-header-wrapper">
          <a href="profile2.html?id=${post.id_autor}" class="profile-link" onclick="event.stopPropagation();">
            <div class="post-header">
                <img src="${avatarUrl}" alt="Perfil" class="avatar">
                <div class="user-info">
                    <strong class="username">${post.nome_usuario || 'Usuário Anônimo'}</strong>
                    <span class="time">${timeAgo}</span>
                </div>
            </div>
          </a>
          <div class="top-right-buttons">
              ${topButtonsHTML}
          </div>
      </div>
      <div class="post-content-link">
          <div class="post-content">
              <p><strong>[${emotionTitle}]</strong>: ${post.descricao}</p>
          </div>
      </div>
      <div class="post-actions">
          <button class="like-btn" aria-label="Curtir" onclick="event.stopPropagation(); alert('Curtir post: ${post.id_registro}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f1eee4" class="bi bi-heart" viewBox="0 0 16 16">
                  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
              </svg> <span>0</span>
          </button>
          <button class="comment-btn" aria-label="Comentar" onclick="event.stopPropagation(); window.location.href='./register.html?id=${post.id_registro}'">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#f1eee4" class="bi bi-chat" viewBox="0 0 16 16">
                  <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105"/>
              </svg> <span>0</span>
          </button>
      </div>
    `;

    return postElement;
}

// Função principal para buscar e exibir os posts públicos
async function loadPublicPosts() {
    const timelineContainer = document.querySelector('.timeline-container');
    // ... (restante da lógica de loadPublicPosts)
    
    // Limpa o conteúdo estático atual (se existir)
    const staticContent = timelineContainer.querySelector('.post-card:not([data-register-id])');
    if (staticContent) {
        timelineContainer.removeChild(staticContent);
    }
    
    timelineContainer.innerHTML = '<p style="text-align: center; color: #f1eee4; font-size: 1.2em;">Carregando a timeline...</p>';

    getLoggedInUserId(); 

    try {
        const response = await fetch(`${BACKEND_URL}/posts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            timelineContainer.innerHTML = ''; 
            if (result.length === 0) {
                timelineContainer.innerHTML = '<p style="color: #f1eee4; font-size: 1.1em; text-align: center;">Ainda não há posts públicos na timeline.</p>';
            } else {
                result.forEach(post => {
                    const card = renderPostCard(post);
                    timelineContainer.appendChild(card);
                });
            }
        } else {
            console.error('Erro ao carregar posts:', result.error);
            timelineContainer.innerHTML = `<p style="color: #dc3545; font-size: 1.1em; text-align: center;">Falha ao carregar a timeline: ${result.error || response.statusText}</p>`;
        }
    } catch (error) {
        console.error('Erro de rede ao buscar posts:', error);
        timelineContainer.innerHTML = '<p style="color: #dc3545; font-size: 1.1em; text-align: center;">Erro de conexão com o servidor ao buscar a timeline.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Esta verificação garante que só executamos a lógica da timeline na página index.html
    if (document.querySelector('.timeline-container')) {
        loadPublicPosts();
    }
});