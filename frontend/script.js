// ARQUIVO: frontend/script.js (FINAL COM NOTIFICAÇÕES E AVATAR GLOBAL)

const BACKEND_URL = 'http://localhost:3000'; 
const DEFAULT_AVATAR_URL = '../assets/user-default.svg'; 

/**
 * Abre o modal de Novo Registro. Esta função é global.
 */
function openModal() {
    // CORREÇÃO: VERIFICAÇÃO DE STATUS DE CONTA ATIVA NO OPEN MODAL
    const userJson = localStorage.getItem('user');
    let is_active_for_posting = true; 

    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            // Verifica se o campo existe e se é false (0)
            if (user.is_active_for_posting === 0 || user.is_active_for_posting === false) { 
                is_active_for_posting = false;
            }
        } catch (e) {
            console.error('Erro ao ler status do usuário:', e);
        }
    }
    
    if (!is_active_for_posting) {
        alert('Sua conta foi temporariamente inativada para novas postagens e comentários devido a violações das diretrizes. Entre em contato com o suporte.');
        return;
    }

    // Cria o container principal do modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    modalContainer.classList.add('active');

    // Adiciona o conteúdo HTML do modal
    modalContainer.innerHTML = `
      <div id="modal" class="modal">
        <div class="modal-header">
          <h1 class="modal-title">Novo Registro</h1>
          <button id="close-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form id="registro-form">
            <div class="form-group emotion-selector">
              <label>Como você se sente?</label>
              <div class="emotion-options">
                <button type="button" class="emotion-btn" data-emocao="Feliz" title="Feliz"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#f1eee4" class="bi bi-emoji-laughing" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
  <path d="M12.331 9.5a1 1 0 0 1 0 1A5 5 0 0 1 8 13a5 5 0 0 1-4.33-2.5A1 1 0 0 1 4.535 9h6.93a1 1 0 0 1 .866.5M7 6.5c0 .828-.448 0-1 0s-1 .828-1 0S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 0-1 0s-1 .828-1 0S9.448 5 10 5s1 .672 1 1.5"/>
</svg></button>
                <button type="button" class="emotion-btn" data-emocao="Triste" title="Triste"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#f1eee4" class="bi bi-emoji-frown" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
  <path d="M4.285 12.433a.5.5 0 0 0 .683-.183A3.5 3.5 0 0 1 8 10.5c1.295 0 2.426.703 3.032 1.75a.5.5 0 0 0 .866-.5A4.5 4.5 0 0 0 8 9.5a4.5 4.5 0 0 0-3.898 2.25.5.5 0 0 0 .183.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5"/>
</svg></button>
                <button type="button" class="emotion-btn" data-emocao="Irritado" title="Irritado"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#f1eee4" class="bi bi-emoji-angry" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
  <path d="M4.285 12.433a.5.5 0 0 0 .683-.183A3.5 3.5 0 0 1 8 10.5c1.295 0 2.426.703 3.032 1.75a.5.5 0 0 0 .866-.5A4.5 4.5 0 0 0 8 9.5a4.5 4.5 0 0 0-3.898 2.25.5.5 0 0 0 .183.683m6.991-8.38a.5.5 0 1 1 .448.894l-1.009.504c.176.27.285.64.285 1.049 0 .828-.448 1.5-1 1.5s-1-.672-1-1.5c0-.247.04-.48.11-.686a.502.502 0 0 1 .166-.761zm-6.552 0a.5.5 0 0 0-.448.894l1.009.504A1.94 1.94 0 0 0 5 6.5C5 7.328 5.448 8 6 8s1-.672 1-1.5c0-.247-.04-.48-.11-.686a.502.502 0 0 0-.166-.761z"/>
</svg></button>
                <button type="button" class="emotion-btn" data-emocao="Ansioso" title="Ansioso"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#f1eee4" class="bi bi-emoji-grimace" viewBox="0 0 16 16">
  <path d="M7 6.25c0 .69-.448 1.25-1 1.25s-1-.56-1-1.25S5.448 5 6 5s1 .56 1 1.25m3 1.25c.552 0 1-.56 1-1.25S10.552 5 10 5s-1 .56-1 1.25.448 1.25 1 1.25m2.98 3.25A1.5 1.5 0 0 1 11.5 12h-7a1.5 1.5 0 0 1-1.48-1.747v-.003A1.5 1.5 0 0 1 4.5 9h7a1.5 1.5 0 0 1 1.48 1.747zm-8.48.75h.25v-.75H3.531a1 1 0 0 0 .969.75m7 0a1 1 0 0 0 .969-.75H11.25v.75zm.969-1.25a1 1 0 0 0-.969-.75h-.25v.75zM4.5 9.5a1 1 0 0 0-.969.75H4.75V9.5zm1.75 2v-.75h-1v.75zm.5 0h1v-.75h-1zm1.5 0h1v-.75h-1zm1.5 0h1v-.75h-1zm1-2h-1v.75h1zm-1.5 0h-1v.75h1zm-1.5 0h-1v.75h1zm-1.5 0h-1v.75h1z"/>
  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14"/>
</svg></button>
                <button type="button" class="emotion-btn" data-emocao="Apaixonado" title="Apaixonado"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#f1eee4" class="bi bi-emoji-heart-eyes" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
  <path d="M11.315 10.014a.5.5 0 0 1 .548.736A4.5 4.5 0 0 1 7.965 13a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .548-.736h.005l.017.005.067.015.252.055c.215.046.515.108.857.169.693.124 1.522.242 2.152.242s1.46-.118 2.152-.242a27 27 0 0 0 1.109-.224l.067-.015.017-.004.005-.002zM4.756 4.566c.763-1.424 4.02-.12.952 3.434-4.496-1.596-2.35-4.298-.952-3.434m6.488 0c1.398-.864 3.544 1.838-.952 3.434-3.067-3.554.19-4.858.952-3.434"/>
</svg></button>
              </div>
            </div>
            <div class="form-group">
              <label for="descricao-textarea">Descrição</label>
              <textarea id="descricao-textarea" rows="4" placeholder="Descreva seu dia e como se sentiu..." required></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="close-btn-modal">Fechar</button>
          <button id="create-btn-modal" type="submit" form="registro-form">Criar</button>
        </div>
      </div>
    `;

    // Insere o modal no corpo do documento
    document.body.appendChild(modalContainer);

    // Adiciona os eventos de fechar o modal
    const closeModalButton = document.getElementById('close-modal-btn');
    const closeBtnModal = document.getElementById('close-btn-modal');
    
    function closeModal() {
      // Remove o modal do DOM
      document.body.removeChild(modalContainer);
    }

    closeModalButton.addEventListener('click', closeModal);
    closeBtnModal.addEventListener('click', closeModal);

    // Fechar o modal ao clicar fora dele
    modalContainer.addEventListener('click', (e) => {
      if (e.target.id === 'modal-container') {
        closeModal();
      }
    });

    // Lógica para enviar o formulário de registro
    const form = document.getElementById('registro-form');
    let selectedEmotion = '';

    // Adiciona evento de clique para os botões de emoção
    document.querySelectorAll('.emotion-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.emotion-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedEmotion = button.getAttribute('data-emocao');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedEmotion) {
            alert('Por favor, selecione uma emoção.');
            return;
        }

        const descricao = document.getElementById('descricao-textarea').value;
        
        const now = new Date();
        const isoString = now.toISOString(); 

        const data = isoString.split('T')[0]; 
        const hora = isoString.split('T')[1].substring(0, 8); 
        
        const token = localStorage.getItem('jwt');

        if (!token) {
            alert('Você precisa estar logado para criar um registro.');
            closeModal();
            window.location.href = 'login.html'; 
            return;
        }

        const registroData = {
            data: data,
            emocao: selectedEmotion,
            descricao: descricao,
            hora: hora, 
        };

        try {
            const response = await fetch(`${BACKEND_URL}/registros`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(registroData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Registro criado com sucesso:', result);
                alert('Registro salvo com sucesso!');
                closeModal();
                window.location.reload(); 
            } else if (response.status === 403) { 
                 const error = await response.json();
                 alert(error.error);
                 closeModal();
            } else {
                const error = await response.json();
                console.error('Erro ao criar registro:', error.error);
                alert('Erro ao criar registro: ' + error.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de conexão com o servidor.');
        }
    });
}

/**
 * Função auxiliar para obter o ID do usuário logado do localStorage
 */
function getLoggedInUserId() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const userData = JSON.parse(userJson);
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

/**
 * Função auxiliar para formatar a data como "há X tempo"
 */
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

/**
 * Carrega e exibe a foto de perfil no cabeçalho de todas as páginas.
 */
function loadProfilePicture() {
    const userJson = localStorage.getItem('user');
    const defaultAvatarUrl = '../assets/user-default.svg'; 

    if (!userJson) return;

    try {
        const userData = JSON.parse(userJson);
        const photoUrl = userData.foto_perfil_url;
        
        const avatarImg = document.querySelector('header #info a img');

        if (avatarImg) {
            const finalAvatarUrl = photoUrl || defaultAvatarUrl;
            avatarImg.src = finalAvatarUrl;
            avatarImg.alt = `Foto de Perfil de ${userData.nome || 'Usuário'}`;
        }
    } catch (e) {
        console.error("Erro ao carregar foto de perfil:", e);
    }
}

// =========================================================================
// Funções de Notificação (Incluídas para resolver o ReferenceError)
// =========================================================================

/**
 * Marca todas as notificações não lidas como lidas no backend.
 */
async function markNotificationsAsRead() {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    try {
        await fetch(`${BACKEND_URL}/notifications/mark-read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Erro ao marcar notificações como lidas:", e);
    }
}

/**
 * Busca e exibe notificações não lidas e atualiza a badge.
 */
async function loadNotifications() {
    const token = localStorage.getItem('jwt');
    const notificationList = document.querySelector('.notification-list');
    const notificationBadge = document.getElementById('notification-badge');

    if (!token || !notificationList || !notificationBadge) return;
    
    notificationList.innerHTML = '<div style="padding: 10px; text-align: center;">Carregando...</div>';

    try {
        const response = await fetch(`${BACKEND_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const notifications = await response.json();

        if (response.ok && Array.isArray(notifications)) {
            // 1. Atualiza o contador (badge)
            notificationBadge.textContent = notifications.length;
            notificationBadge.style.display = notifications.length > 0 ? 'block' : 'none';

            // 2. Renderiza a lista de notificações
            if (notifications.length === 0) {
                 notificationList.innerHTML = '<div style="padding: 10px; text-align: center; color: #aaa;">Nenhuma notificação nova.</div>';
                 return;
            }

            const menuContent = notifications.map(n => {
                const postLink = `./register.html?id=${n.id_registro}`;
                const time = formatTimeAgo(n.data_hora);
                
                const senderName = n.nome_origem || 'Usuário Deletado';
                let message = '';

                if (n.tipo === 'comentario') {
                   message = `comentou no seu post!`;
                } else if (n.tipo === 'curtida') {
                   message = `curtiu o seu post!`;
                } else {
                   message = n.conteudo; 
                }

                const avatarUrl = n.foto_perfil_url || DEFAULT_AVATAR_URL;


                return `
                    <a href="${postLink}" class="notification-item" onclick="event.stopPropagation(); window.location.href='${postLink}';">
                        <img src="${avatarUrl}" alt="Avatar" class="notification-avatar">
                        <div class="notification-content">
                            <span class="notification-message"><strong>${senderName}</strong> ${message}</span>
                            <span class="notification-time">${time}</span>
                        </div>
                    </a>
                `;
            }).join('');

            notificationList.innerHTML = `
                ${menuContent}
                <a href="./notifications.html" class="view-all-btn">Ver todas as notificações</a>
            `;

        } else {
            console.error('Falha ao carregar notificações:', notifications.error);
            notificationList.innerHTML = '<div style="padding: 10px; text-align: center; color: red;">Erro ao carregar notificações.</div>';
        }
    } catch (error) {
        console.error('Erro de rede ao buscar notificações:', error);
        notificationList.innerHTML = '<div style="padding: 10px; text-align: center; color: red;">Erro de conexão com o servidor.</div>';
    }
}
// =========================================================================


// =========================================================================
// FUNÇÃO: Ajustar a navegação e o acesso com base no perfil
// =========================================================================
function updateNavigationForUserRole() {
    const userJson = localStorage.getItem('user');
    const link2 = document.getElementById('nav-link-2') || document.getElementById('nav-dynamic-link'); 
    const link3 = document.getElementById('nav-link-3'); 

    if (!userJson || !link2 || !link3) {
        return;
    }

    try {
        const user = JSON.parse(userJson);
        const currentPath = window.location.pathname;
        
        if (user.is_psicologo) {
            link2.setAttribute('href', './consultas.html');
            link2.textContent = 'Consultas'; 

            link3.setAttribute('href', './pacientes.html');
            link3.textContent = 'Pacientes';
            
            if (currentPath.includes('registers.html')) {
                 window.location.replace('./consultas.html');
            } else if (currentPath.includes('chat.html')) {
                window.location.replace('./pacientes.html');
            }

        } else {
            link2.setAttribute('href', './registers.html');
            link2.textContent = 'Diário';

            link3.setAttribute('href', './chat.html');
            link3.textContent = 'Chat IA';
            
            if (currentPath.includes('consultas.html')) {
                 window.location.replace('./registers.html');
            } else if (currentPath.includes('pacientes.html')) {
                 window.location.replace('./chat.html');
            }
        }
    } catch (e) {
        console.error('Erro ao processar dados do usuário no localStorage:', e);
    }
}


// Lógica do dropdown de notificação (MODIFICADA PARA USAR A NOVA FUNÇÃO)
document.addEventListener('DOMContentLoaded', () => {
    // Chama a nova função de ajuste de navegação ao carregar a página
    updateNavigationForUserRole();

    // NOVO: Chama a função para carregar a foto de perfil
    loadProfilePicture();
    
    // NOVO: Chamada inicial para carregar notificações ao carregar a página
    loadNotifications();

    let dropdownToggle = document.getElementById('dropdownToggle');
    let dropdownMenu = document.getElementById('dropdownMenu');

    if (dropdownToggle) {
        // Função para mostrar/esconder o dropdown
        function toggleDropdown() {
            dropdownMenu.classList.toggle('active');
            
            // Se o menu está sendo ABERTO
            if (dropdownMenu.classList.contains('active')) {
                // Marca as notificações como lidas no DB
                const notificationBadge = document.getElementById('notification-badge');
                if (notificationBadge && notificationBadge.textContent > 0) {
                    markNotificationsAsRead();
                }
                // Recarrega a lista para mostrar a mudança
                loadNotifications();
            } else {
                // Se o menu está sendo FECHADO
                // Garante que a badge desapareça/seja zerada (se a marcação como lida foi bem-sucedida)
                const notificationBadge = document.getElementById('notification-badge');
                if (notificationBadge) notificationBadge.style.display = 'none';
            }
        }

        // Função para esconder o dropdown
        function hideDropdown() {
            dropdownMenu.classList.remove('active');
        }

        dropdownToggle.addEventListener('click', (event) => {
            event.preventDefault(); 
            event.stopPropagation(); 
            toggleDropdown();
        });

        // Ocultar o dropdown quando clicar fora dele
        document.addEventListener('click', (event) => {
            if (!dropdownMenu.contains(event.target) && !dropdownToggle.contains(event.target)) {
                hideDropdown();
            }
        });
    }
});