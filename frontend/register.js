// ARQUIVO: frontend/register.js (LÓGICA DE VISUALIZAÇÃO DE POST E COMENTÁRIOS)

const BACKEND_URL = 'http://localhost:3000';

function getRegisterIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'), 10);
}

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

function getLoggedInUserId() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const userData = JSON.parse(userJson);
            // Retorna o ID do usuário como Number.
            return Number(userData.id_usuario); 
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Verifica se o usuário tem permissão para postar/comentar
function getLoggedInUserPostingStatus() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            // Retorna TRUE se a conta estiver ATIVA (1 ou true), FALSE caso contrário.
            return user.is_active_for_posting === 1 || user.is_active_for_posting === true; 
        } catch (e) {
            return false;
        }
    }
    return false; // Assume false se não há dados de login
}


// =========================================================================
// RENDERIZAÇÃO
// =========================================================================

function renderPost(post) {
    const postContainer = document.getElementById('post-container');
    const timeAgo = formatTimeAgo(post.data);
    const emotionTitle = post.emocao ? post.emocao.toUpperCase() : 'REGISTRO';
    
    // Conteúdo da postagem completa
    postContainer.innerHTML = `
        <div class="post-header-wrapper">
            <a href="profile2.html?id=${post.id_autor}" class="profile-link">
                <div class="post-header">
                    <img src="../assets/user-default.svg" alt="Perfil" class="avatar">
                    <div class="user-info">
                        <strong class="username">${post.nome_usuario || 'Usuário Anônimo'}</strong>
                        <span class="time">${timeAgo}</span>
                    </div>
                </div>
            </a>
            </div>
        <div class="post-content">
            <p style="font-size: 1.2em; font-weight: bold; color: #ddd;">[${emotionTitle}]</p>
            <p>${post.descricao}</p>
        </div>
        <div class="post-actions">
            </div>
    `;
}

function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '';

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: #ccc; text-align: center;">Seja o primeiro a comentar!</p>';
        return;
    }

    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('coment-card');
        
        const timeAgo = formatTimeAgo(comment.data_hora);

        commentDiv.innerHTML = `
            <div class="post-header">
              <img src="../assets/user-default.svg" alt="Perfil" class="avatar">
              <div class="user-info">
                <strong class="username">${comment.nome_usuario || 'Usuário Anônimo'}</strong>
                <span class="time">${timeAgo}</span>
              </div>
            </div>
            <div class="post-content">
              <p>${comment.conteudo}</p>
            </div>
        `;
        commentsList.appendChild(commentDiv);
    });
}

function renderCommentForm(registerId) {
    const formContainer = document.getElementById('new-comment-form');
    const isLoggedIn = getLoggedInUserId() !== null;
    const isActive = getLoggedInUserPostingStatus();

    if (!isLoggedIn) {
        formContainer.innerHTML = '<p style="text-align: center;"><a href="login.html">Faça login</a> para comentar.</p>';
        return;
    }
    
    // Bloqueia a criação de comentários para usuário inativo
    if (!isActive) {
        formContainer.innerHTML = '<p style="color: #dc3545; text-align: center; font-weight: bold;">Sua conta está inativa para comentários.</p>';
        return;
    }


    formContainer.innerHTML = `
        <form id="comment-form" style="margin-bottom: 20px;">
            <input id="comment-textarea" placeholder="Adicione um comentário..." required></input>
            <button type="submit" class="create-btn">Comentar</button>
        </form>
    `;
    
    // Adicionar evento de submit ao novo formulário
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('comment-textarea').value;
        await postComment(registerId, content);
    });
}

// =========================================================================
// LÓGICA DE DADOS
// =========================================================================

async function fetchPostData(registerId) {
    const token = localStorage.getItem('jwt');
    // Adiciona Authorization apenas se o token existir
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
        const [postResponse, commentsResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/posts/${registerId}`, { headers }),
            fetch(`${BACKEND_URL}/posts/${registerId}/comentarios`, { headers })
        ]);

        const post = await postResponse.json();
        const comments = await commentsResponse.json();

        if (postResponse.ok) {
            renderPost(post);
            renderCommentForm(registerId); // Passa o ID correto aqui
            if (commentsResponse.ok) {
                renderComments(comments);
            } else {
                console.error('Erro ao carregar comentários:', comments);
                document.getElementById('comments-list').innerHTML = '<p style="color: #dc3545;">Erro ao carregar comentários.</p>';
            }
        } else {
            // Se o post não for encontrado (404), pode ser porque ele foi denunciado ou arquivado
            document.getElementById('post-container').innerHTML = `<p style="color: #dc3545; text-align: center;">${post.mensagem || 'Post não encontrado ou indisponível.'}</p>`;
        }
        
    } catch (error) {
        console.error('Erro de rede ao buscar dados do post:', error);
        document.getElementById('post-container').innerHTML = `<p style="color: #dc3545; text-align: center;">Erro de conexão com o servidor.</p>`;
    }
}

async function postComment(registerId, content) {
    const token = localStorage.getItem('jwt');
    
    try {
        const response = await fetch(`${BACKEND_URL}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_registro: registerId,
                conteudo: content
            })
        });

        if (response.ok) {
            document.getElementById('comment-textarea').value = '';
            // Recarrega o conteúdo do post para melhor UX
            fetchPostData(registerId); 
        } else if (response.status === 403) {
            const error = await response.json();
            alert(error.error);
        } else {
            const error = await response.json();
            alert(`Falha ao postar comentário: ${error.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Erro de rede ao postar comentário:', error);
        alert('Erro de rede ao postar comentário.');
    }
}


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

const registroId = getRegisterIdFromUrl();

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se a página está sendo usada para visualização de um post (se tem ID na URL)
    if (!registroId || isNaN(registroId)) {
        // Se não houver ID, assume-se que esta página seria para o registro/signup
        // Como o foco é a visualização, apenas exibe erro se o ID for inválido.
        if (document.getElementById('post-container')) {
            document.getElementById('post-container').innerHTML = '<p style="color: #dc3545; text-align: center;">ID de registro inválido. Use a timeline para acessar posts.</p>';
        }
    } else {
        fetchPostData(registroId);
    }
});