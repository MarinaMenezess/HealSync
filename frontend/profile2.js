// ARQUIVO: frontend/profile2.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtém o ID do usuário da URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    // CORREÇÃO: LENDO A CHAVE CORRETA 'jwt'
    const token = localStorage.getItem('jwt'); 
    
    // CORREÇÃO: URL base do seu backend, usando 127.0.0.1 para consistência com o frontend
    const API_BASE_URL = 'http://127.0.0.1:3000'; 
    const AUTH_HEADER = { 'Authorization': `Bearer ${token}` };

    // Checagem de token inicial
    if (!token) {
        const errorMessage = "ERRO: Token de autenticação não encontrado no armazenamento local. Por favor, faça login novamente.";
        console.error(errorMessage);
        alert(errorMessage); 
        window.location.href = './login.html';
        return;
    }

    if (!userId) {
        document.getElementById('profile-name-display').textContent = 'Erro: ID do usuário não fornecido na URL.';
        return;
    }

    // Função auxiliar para tratamento de erro de autenticação e redirecionamento
    function handleAuthError(response) {
        // Verifica se o erro é de autenticação (401 - Não Autorizado ou 403 - Proibido)
        if (response.status === 401 || response.status === 403) {
            const errorMessage = `Sessão expirada ou Token inválido. Status: ${response.status}. Redirecionando para o login.`;
            
            console.error(errorMessage);
            alert(errorMessage); 

            // Limpa o token e redireciona
            localStorage.removeItem('jwt'); // Limpando a chave correta
            window.location.href = './login.html';
            return true; 
        }
        return false; 
    }

    // Carregar Perfil (Nome e Título)
    function loadProfile() {
        fetch(`${API_BASE_URL}/profile-data/${userId}`, {
            method: 'GET',
            headers: AUTH_HEADER
        })
        .then(response => {
            if (handleAuthError(response)) return; 

            if (!response.ok) {
                throw new Error('Perfil não encontrado ou erro de rede/servidor.');
            }
            return response.json();
        })
        .then(data => {
             if (data) {
                document.getElementById('profile-name-display').textContent = data.nome;
                document.getElementById('user-posts-title-display').textContent = `Registros de ${data.nome}`;
                document.getElementById('profile-email-display').textContent = 'Informação privada'; 
                
                // NOVO: Atualiza a foto de perfil
                const avatarImg = document.getElementById('profile-avatar-display');
                if (data.foto_perfil_url) {
                    avatarImg.src = data.foto_perfil_url;
                } else {
                    // Mantém ou redefine para o padrão, se a URL for null
                    avatarImg.src = '../assets/user-default.svg'; 
                }
             }
        })
        .catch(error => {
            console.error('Erro ao carregar perfil:', error);
            document.getElementById('profile-name-display').textContent = 'Erro ao carregar perfil.';
            document.getElementById('profile-email-display').textContent = '';
            document.getElementById('user-posts-title-display').textContent = 'Registros do Usuário';
        });
    }

    // Carregar Posts Públicos
    function loadPosts() {
        fetch(`${API_BASE_URL}/users/${userId}/public-posts`, {
            method: 'GET',
            headers: AUTH_HEADER
        })
        .then(response => {
            if (handleAuthError(response)) return;

            if (!response.ok) {
                throw new Error('Erro ao carregar posts.');
            }
            return response.json();
        })
        .then(posts => {
            const postsContainer = document.getElementById('user-posts-container-display');
            const noPostsMessage = document.getElementById('no-posts-message');
            postsContainer.innerHTML = ''; 
            
            if (!posts || posts.length === 0) {
                noPostsMessage.style.display = 'block';
                return;
            }

            noPostsMessage.style.display = 'none';

            posts.forEach(post => {
                const postCard = document.createElement('div');
                postCard.classList.add('post-card');
                
                const postDate = new Date(post.data);
                const formattedDate = postDate.toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                postCard.innerHTML = `
                    <p class="post-content">${post.descricao}</p>
                    <div class="post-actions">
                        <span class="time">${formattedDate}</span>
                    </div>
                `;
                postsContainer.appendChild(postCard);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar posts:', error);
            document.getElementById('user-posts-container-display').innerHTML = '<p style="color: red; text-align: center;">Não foi possível carregar os posts.</p>';
        });
    }

    // Iniciar o carregamento
    loadProfile();
    loadPosts();
});