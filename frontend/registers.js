// ARQUIVO: frontend/registers.js (CONTEÚDO SUGERIDO)

// As variáveis BACKEND_URL e DEFAULT_AVATAR_URL são definidas em script.js

// Funções auxiliares (getLoggedInUserId, formatTimeAgo, etc.) assumidamente definidas em script.js

// Renderiza um cartão de registro (sem a lógica de moderação/denúncia da timeline)
function renderRegisterCard(registro) {
    const postElement = document.createElement('div');
    postElement.classList.add('post-card');
    
    const timeAgo = formatTimeAgo(registro.data);
    const emotionTitle = registro.emocao ? registro.emocao.toUpperCase() : 'REGISTRO';
    const isPublicText = registro.is_public ? 'Público' : 'Privado';
    const isPublicColor = registro.is_public ? '#28a745' : '#ffc107';

    // ATENÇÃO: Se for para exibir o avatar aqui, você precisará modificar a rota GET /registros no backend 
    // para retornar também a foto_perfil_url do autor (que é o próprio usuário logado). 
    // Por enquanto, usaremos a foto do usuário logado do localStorage (que é atualizada globalmente).
    const userJson = localStorage.getItem('user');
    const userData = userJson ? JSON.parse(userJson) : {};
    const avatarUrl = userData.foto_perfil_url || DEFAULT_AVATAR_URL;


    // REDIRECIONAMENTO AO CLICAR NO CARD:
    postElement.addEventListener('click', () => {
         window.location.href = `./register.html?id=${registro.id_registro}`;
    });

    postElement.innerHTML += `
      <div class="post-header-wrapper">
        <div class="post-header">
            <img src="${avatarUrl}" alt="Perfil" class="avatar">
            <div class="user-info">
                <strong class="username">${userData.nome || 'Meu Registro'}</strong>
                <span class="time">${timeAgo}</span>
            </div>
        </div>
        <div class="top-right-buttons">
             <span style="color: ${isPublicColor}; font-weight: bold; padding: 4px 8px; border: 1px solid ${isPublicColor}; border-radius: 4px; background-color: #3b1b1b;">${isPublicText}</span>
        </div>
      </div>
      <div class="post-content-link">
          <div class="post-content">
              <p><strong>[${emotionTitle}]</strong>: ${registro.descricao}</p>
          </div>
      </div>
      <div class="post-actions">
          <a href="./register.html?id=${registro.id_registro}"><button class="comment-btn" aria-label="Ver Detalhes" onclick="event.stopPropagation();">
              Ver Detalhes
          </button></a>
      </div>
    `;

    return postElement;
}

// Função principal para buscar e exibir os registros do usuário
async function loadUserRegisters() {
    const registersContainer = document.querySelector('.registers-container');
    const token = localStorage.getItem('jwt');
    
    if (!token) {
        registersContainer.innerHTML = '<p style="color: #dc3545; font-size: 1.1em; text-align: center;">Você precisa estar logado para ver seus registros.</p>';
        return;
    }

    registersContainer.innerHTML = '<p style="text-align: center; color: #f1eee4; font-size: 1.2em;">Carregando seus registros...</p>';

    try {
        const response = await fetch(`${BACKEND_URL}/registros`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            registersContainer.innerHTML = ''; 
            if (result.length === 0) {
                registersContainer.innerHTML = '<p style="color: #f1eee4; font-size: 1.1em; text-align: center;">Você ainda não possui registros no seu diário.</p>';
            } else {
                result.forEach(registro => {
                    const card = renderRegisterCard(registro);
                    registersContainer.appendChild(card);
                });
            }
        } else {
            console.error('Erro ao carregar registros:', result.error);
            registersContainer.innerHTML = `<p style="color: #dc3545; font-size: 1.1em; text-align: center;">Falha ao carregar seus registros: ${result.error || response.statusText}</p>`;
        }
    } catch (error) {
        console.error('Erro de rede ao buscar registros:', error);
        registersContainer.innerHTML = '<p style="color: #dc3545; font-size: 1.1em; text-align: center;">Erro de conexão com o servidor ao buscar seu diário.</p>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Esta verificação garante que só executamos a lógica na página registers.html
    if (document.querySelector('.registers-container')) {
        loadUserRegisters();
    }
});