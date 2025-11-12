// ARQUIVO: frontend/notifications.js (LÓGICA DE LISTAGEM DE NOTIFICAÇÕES)

// Assumindo que BACKEND_URL está definido em um script global ou aqui.

// Helper function (Reutilizada de outros scripts frontend)
function formatTimeAgo(dateString) {
    if (!dateString) return "Data inválida";
    const now = new Date();
    // Cria um objeto Date corrigindo o formato MySQL (YYYY-MM-DD HH:MM:SS)
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

// Funções de formatação de notificação para a exibição
function formatNotificationContent(notification) {
    const { nome_origem, conteudo, tipo } = notification;
    const userDisplay = nome_origem || 'Um usuário';

    switch (tipo) {
        case 'curtida':
            return `<strong>${userDisplay}</strong> curtiu o seu post.`;
        case 'comentario':
            // O backend envia 'novo comentário no seu post!' no campo 'conteudo'
            return `<strong>${userDisplay}</strong> deixou um ${conteudo}`;
        // Adicione outros tipos conforme necessário
        default:
            return `${userDisplay}: ${conteudo}`;
    }
}

// Renderiza a lista completa de notificações
function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    const badge = document.getElementById('notification-badge');
    container.innerHTML = '';
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #ccc;">Você não tem notificações.</p>';
        if (badge) badge.style.display = 'none';
        return;
    }
    
    // Atualiza o contador de não lidas para o ícone na navegação (se existir)
    const unreadCount = notifications.filter(n => n.lida === 0 || n.lida === false).length;
    if (badge) {
        badge.textContent = unreadCount > 0 ? unreadCount : '';
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }


    notifications.forEach(notif => {
        const item = document.createElement('li');
        
        // Adiciona o ID da notificação para uso no event listener
        item.dataset.notificationId = notif.id_notificacao; // Adiciona o ID da notificação
        
        // Adiciona a classe 'notification-card' no LI e a classe de estado (unread/read)
        item.classList.add('notification-card', notif.lida === 0 ? 'unread' : 'read');

        // Cria o link para o registro, se aplicável
        const link = notif.id_registro ? `href="register.html?id=${notif.id_registro}"` : 'href="#"';

        // Determina se deve incluir o indicador visual (a bolinha)
        const unreadIndicator = notif.lida === 0 ? '<div class="unread-indicator-dot"></div>' : '';

        // Nova estrutura para melhor controle de layout com Flexbox
        item.innerHTML = `
            <a ${link} class="notification-link">
                <img src="${notif.foto_perfil_url || '../assets/user-default.svg'}" alt="Perfil" class="notification-avatar">
                <div class="notification-content-wrapper">
                    <p class="message">
                        ${formatNotificationContent(notif)}
                    </p>
                    <span class="time">${formatTimeAgo(notif.data_hora)}</span>
                </div>
                ${unreadIndicator}
            </a>
        `;
        container.appendChild(item);
    });
}

// Busca todas as notificações do usuário
async function fetchNotifications() {
    const token = localStorage.getItem('jwt');
    if (!token) {
        document.getElementById('notifications-list').innerHTML = '<p style="text-align: center;"><a href="login.html">Faça login</a> para ver notificações.</p>';
        return;
    }

    try {
        // A requisição agora retorna TODAS as notificações, ordenadas por data
        const response = await fetch(`${BACKEND_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const notifications = await response.json();
            renderNotifications(notifications);
        } else {
            console.error('Falha ao buscar notificações:', response.status);
            document.getElementById('notifications-list').innerHTML = '<p style="text-align: center; color: #dc3545;">Erro ao carregar notificações. Tente novamente.</p>';
        }
    } catch (error) {
        console.error('Erro de rede ao buscar notificações:', error);
        document.getElementById('notifications-list').innerHTML = '<p style="text-align: center; color: #dc3545;">Erro de conexão com o servidor.</p>';
    }
}

// Marca todas as notificações não lidas como lidas
async function markAllAsRead() {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    try {
        const response = await fetch(`${BACKEND_URL}/notifications/mark-read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // Após marcar como lido, recarrega a lista para atualizar o estado e o badge
            fetchNotifications(); 
        } else {
            console.error('Falha ao marcar como lido:', response.status);
        }
    } catch (error) {
        console.error('Erro de rede ao marcar como lido:', error);
    }
}

// Marca uma única notificação como lida
async function markSingleAsRead(notificationId, listItemElement) {
    const token = localStorage.getItem('jwt');
    // Verifica se a notificação já está marcada como lida no DOM para evitar chamadas desnecessárias
    if (!token || !notificationId || (listItemElement && listItemElement.classList.contains('read'))) return;

    // Remove a classe 'unread' e adiciona 'read' imediatamente para melhor UX
    if (listItemElement && listItemElement.classList.contains('unread')) {
        listItemElement.classList.remove('unread');
        listItemElement.classList.add('read');
        const dot = listItemElement.querySelector('.unread-indicator-dot');
        if(dot) dot.remove(); // Remove o indicador visual
    }
    
    try {
        // Supondo um endpoint para marcar uma única notificação: PUT /notifications/:id/mark-read
        const response = await fetch(`${BACKEND_URL}/notifications/${notificationId}/mark-read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
             console.error('Falha ao marcar notificação como lida no backend:', response.status);
             // Manteremos o log de erro.
        }
    } catch (error) {
        console.error('Erro de rede ao marcar notificação como lida:', error);
    }
}


// =========================================================================
// INICIALIZAÇÃO E EVENT LISTENERS
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega todas as notificações
    fetchNotifications();

    // 2. Adiciona evento ao botão "Marcar todas como lidas"
    const markReadBtn = document.getElementById('mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', markAllAsRead);
    }
    
    // 3. Adiciona evento para marcar como lida ao CLICAR em um item de notificação
    document.getElementById('notifications-list').addEventListener('click', (e) => {
        let target = e.target;
        // Navega até o elemento <li> que contém o card da notificação e o ID
        const listItem = target.closest('.notification-card');
        
        if (listItem && listItem.classList.contains('unread')) {
             const notificationId = listItem.dataset.notificationId;
             if (notificationId) {
                // Marca a notificação como lida (assíncrono, não bloqueia a navegação)
                markSingleAsRead(notificationId, listItem); 
             }
        }
        
        // A navegação real é manipulada pelo elemento <a>, que o browser 
        // trata após o evento de clique.
    });
});