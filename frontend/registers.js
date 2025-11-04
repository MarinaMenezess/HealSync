// ARQUIVO: frontend/registers.js (NOVO)

const BACKEND_URL = 'http://localhost:3000';

// Função auxiliar para formatar a data (AAAA-MM-DD para DD/MM/AAAA)
function formatDisplayDate(dateString) {
    if (!dateString) return 'Data não informada';
    // Espera YYYY-MM-DD, devolve DD/MM/AAAA
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
}

// Renderiza um cartão de registro individual
function renderRegisterCard(register) {
    const card = document.createElement('div');
    card.classList.add('register-card');
    // Adiciona link para a página de visualização/edição completa (assumindo que existe)
    card.setAttribute('data-register-id', register.id_registro);
    // Link de navegação (apenas para exemplo, a rota view-register.html precisa ser criada)
    card.onclick = () => {
        alert(`Redirecionando para a visualização do Registro ID: ${register.id_registro}`);
        // window.location.href = `./view-register.html?registerId=${register.id_registro}`;
    };

    const formattedDate = formatDisplayDate(register.data);
    const emotion = register.emocao || 'Não informado';
    // Exibe apenas a primeira linha da descrição
    const preview = register.descricao ? register.descricao.split('\n')[0].substring(0, 70) : 'Sem descrição.';

    card.innerHTML = `
        <div>
            <h4>${emotion.toUpperCase()}</h4>
            <span class="date">${formattedDate}</span>
        </div>
        <p style="font-size: 0.9em; color: #d4d4d4; text-align: left;">${preview}</p>
        <div style="display: flex; justify-content: flex-end; width: 100%;">
            <button class="publish-btn" onclick="event.stopPropagation(); alert('Editar Registro ID: ${register.id_registro}')">
                Editar
            </button>
        </div>
    `;

    return card;
}

// Função principal para buscar e exibir os registros
async function loadUserRegisters() {
    const token = localStorage.getItem('jwt');
    const registersContainer = document.getElementById('registers-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    loadingMessage.style.display = 'block';
    registersContainer.innerHTML = '';
    errorMessage.style.display = 'none';

    if (!token) {
        errorMessage.textContent = 'Sessão expirada. Por favor, faça login novamente.';
        errorMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/registros`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            if (result.length === 0) {
                registersContainer.innerHTML = '<p style="color: #f1eee4; font-size: 1.1em; text-align: center;">Você ainda não tem registros no seu diário.</p>';
            } else {
                result.forEach(register => {
                    const card = renderRegisterCard(register);
                    registersContainer.appendChild(card);
                });
            }
        } else {
            console.error('Erro ao carregar registros:', result.error);
            errorMessage.textContent = `Falha ao carregar registros: ${result.error || response.statusText}`;
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro de rede ao buscar registros:', error);
        errorMessage.textContent = 'Erro de conexão com o servidor ao buscar seus registros.';
        errorMessage.style.display = 'block';
    } finally {
        loadingMessage.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', loadUserRegisters);