// ARQUIVO: frontend/psy-profile.js

document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:3000';

    // Função para extrair o ID do psicólogo da URL (parâmetro 'id')
    function getPsychologistIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    // Função para renderizar o perfil na página
    function renderProfile(user, id) {
        // Mapeamento dos IDs do HTML
        const nameElement = document.getElementById('psy-name');
        const contactElement = document.getElementById('psy-contact');
        const specialtyElement = document.getElementById('psy-specialty');
        const bioTextElement = document.getElementById('psy-bio-text');
        const scheduleBtn = document.getElementById('schedule-button');
        const rateBtn = document.getElementById('rate-button');
        
        // Injetando dados
        if (nameElement) nameElement.textContent = user.nome;
        
        // O backend retorna 'contato' (e-mail é removido para perfis públicos)
        if (contactElement) contactElement.textContent = `Contato: ${user.contato || 'Não Informado'}`;
        
        // Especialidade e Biografia (agora no bloco principal)
        if (specialtyElement) specialtyElement.textContent = user.especialidade || 'Especialidade não especificada';
        if (bioTextElement) bioTextElement.textContent = user.bio || 'Sem descrição de perfil disponível.';
        
        // Configurar o botão de agendamento (Redirecionamento para agenda.html)
        if (scheduleBtn) {
             scheduleBtn.setAttribute('data-psicologo-id', id);
             scheduleBtn.addEventListener('click', () => {
                 const psyName = user.nome;
                 // REDIRECIONAMENTO PARA A AGENDA COM PARÂMETROS
                 window.location.href = `./agenda.html?psyId=${id}&psyName=${encodeURIComponent(psyName)}`;
             });
        }
        
        // Configurar o botão de avaliação
        if (rateBtn) {
             rateBtn.addEventListener('click', () => {
                 alert(`Abrindo modal de avaliação para ${user.nome} (ID: ${id}).`);
             });
        }
        
        // Exibição de avaliação (na seção 'Avaliações')
        const reviewsContent = document.getElementById('reviews-content');
        if (reviewsContent) {
            reviewsContent.innerHTML = `
                <div class="review-summary">
                    <p>Avaliação Média: <b>${user.avaliacao ? user.avaliacao.toFixed(1) : 'N/A'}</b></p>
                    <p>Total de Avaliações: N/A</p>
                </div>
                <p>Detalhes das avaliações virão de uma futura rota /reviews.</p>
            `;
        }
    }

    // Função para buscar os dados do perfil
    async function fetchPsychologistProfile() {
        const id = getPsychologistIdFromUrl();
        const mainCard = document.querySelector('.profile-card');

        // Garante que o link de navegação dinâmico seja atualizado (se o usuário estiver logado)
        // Chamado via script.js no DOMContentLoaded, mas repetimos aqui para segurança.
        if(window.updateNavigationForUserRole) window.updateNavigationForUserRole();

        if (!id) {
            if (mainCard) mainCard.innerHTML = '<h3 class="profile-name">Erro: ID do psicólogo não fornecido na URL.</h3>';
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/users/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const user = await response.json();
                renderProfile(user, id);
            } else {
                const error = await response.json();
                if (mainCard) mainCard.querySelector('.profile-name').textContent = `Erro: ${error.error || 'Não foi possível carregar o perfil.'}`;
                console.error('Erro ao buscar perfil:', error);
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            if (mainCard) mainCard.querySelector('.profile-name').textContent = 'Erro de conexão com o servidor.';
        }
    }

    fetchPsychologistProfile();
});