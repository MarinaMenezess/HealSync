// ARQUIVO: frontend/psicologos.js

document.addEventListener('DOMContentLoaded', () => {
    const psychologistsListContainer = document.getElementById('psychologists-list');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // URL base do backend
    const BACKEND_URL = 'http://localhost:3000';

    // Função para renderizar um card de psicólogo com a estrutura exata desejada
    function createPsychologistCard(psychologist) {
        // Campos obtidos da rota /psychologists: id_usuario, nome, especialidade, avaliacao
        const defaultAvatar = '../assets/user-default.svg'; 
        const defaultBio = 'Profissional com experiência em diversas áreas da psicologia. Atua com foco no bem-estar e desenvolvimento pessoal de seus pacientes.';
        
        // 1. URL para ver o perfil completo (usada na tag <a>)
        const profileUrl = `./psy-profile.html?id=${psychologist.id_usuario}`;

        const card = document.createElement('div');
        card.classList.add('psychologist-card');
        
        // Estrutura do card injetada (mantendo classes e ordem)
        card.innerHTML = `
            <img src="${defaultAvatar}" alt="Foto de Perfil" class="psychologist-avatar">
            <div class="psychologist-info">
                <h3>${psychologist.nome}</h3>
                <p class="specialty">${psychologist.especialidade || 'Especialidade não especificada'}</p>
                <p class="bio">${defaultBio}</p>
            </div>
            <div class="card-actions">
                <a href="${profileUrl}" class="view-profile-btn">Ver Perfil Completo</a>
                <button class="schedule-btn" data-psicologo-id="${psychologist.id_usuario}" data-psicologo-name="${psychologist.nome}">Agendar Consulta</button>
            </div>
        `;

        // 2. Lógica para redirecionamento ao Agendar Consulta
        card.querySelector('.schedule-btn').addEventListener('click', (event) => {
            const psyId = event.target.getAttribute('data-psicologo-id');
            const psyName = event.target.getAttribute('data-psicologo-name');
            
            // REDIRECIONAMENTO PARA A AGENDA COM PARÂMETROS
            window.location.href = `./agenda.html?psyId=${psyId}&psyName=${encodeURIComponent(psyName)}`;
        });

        return card;
    }

    // Função principal para buscar e exibir os psicólogos, aceitando um termo de busca
    async function fetchPsychologists() {
        const searchTerm = searchInput.value.trim();
        let url = `${BACKEND_URL}/psychologists`;

        if (searchTerm) {
            // Adiciona o termo de pesquisa como query parameter
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }

        psychologistsListContainer.innerHTML = ''; // Limpa a listagem anterior

        // Exibe mensagem de carregamento enquanto busca
        const loadingMessage = document.createElement('p');
        loadingMessage.textContent = 'Buscando psicólogos...';
        psychologistsListContainer.appendChild(loadingMessage);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const psychologists = await response.json();
                
                psychologistsListContainer.innerHTML = ''; // Limpa a mensagem de carregamento
                
                if (psychologists.length > 0) {
                    psychologists.forEach(psy => {
                        psychologistsListContainer.appendChild(createPsychologistCard(psy));
                    });
                } else {
                    psychologistsListContainer.innerHTML = '<p class="empty-list-message">Nenhum psicólogo encontrado que corresponda à sua pesquisa.</p>';
                }
            } else {
                const error = await response.json();
                console.error('Erro ao buscar psicólogos:', error.error);
                psychologistsListContainer.innerHTML = `<p class="error-message">Erro ao carregar psicólogos: ${error.error}</p>`;
            }
        } catch (error) {
            console.error('Erro de rede ao buscar psicólogos:', error);
            psychologistsListContainer.innerHTML = `<p class="error-message">Erro de conexão com o servidor. Verifique se o backend está ativo em ${BACKEND_URL}.</p>`;
        }
    }

    // Vincula a pesquisa ao clique do botão
    if(searchButton) {
        searchButton.addEventListener('click', fetchPsychologists);
    }

    // Vincula a pesquisa à tecla Enter no campo de busca
    if(searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Impede submissão de formulário
                fetchPsychologists();
            }
        });
    }

    // Carrega a lista inicial ao carregar a página
    fetchPsychologists();
});