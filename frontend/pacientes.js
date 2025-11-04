// Constantes e funções auxiliares que podem ser necessárias (mantendo a originalidade do código)
const BACKEND_URL = 'http://localhost:3000';

// Função auxiliar para formatar a data (DD/MM - HH:MM)
// Esta função pode não ser usada nesta tela, mas é mantida por segurança se o backend mudar.
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} - ${hours}:${minutes}`;
}


// =================================================================
// LÓGICA DE CARREGAMENTO DE PACIENTES PARA ANOTAÇÕES
// Movida de consultas.js
// =================================================================

async function loadPatientNotesList() {
    const notesContainer = document.getElementById('notes-content');
    notesContainer.innerHTML = ''; // Limpa o conteúdo anterior

    const token = localStorage.getItem('jwt');

    if (!token) {
        notesContainer.innerHTML = '<p class="error-message">Erro de autenticação. Faça login novamente.</p>';
        return;
    }

    try {
        // ENDPOINT: Retorna pacientes que tiveram/têm consultas com o psicólogo logado
        const response = await fetch(`${BACKEND_URL}/consultas/pacientes-atendidos`, { 
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Este bloco é crucial para tratar o 404 e o SyntaxError subsequente
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro ${response.status} ao carregar pacientes:`, errorText);
            
            // Tenta analisar o JSON para erros específicos do backend
            try {
                const results = JSON.parse(errorText);
                notesContainer.innerHTML = `<p class="error-message">Erro ao carregar pacientes: ${results.error || response.statusText}.</p>`;
            } catch (e) {
                notesContainer.innerHTML = `<p class="error-message">Erro de servidor (${response.status}). Verifique o console para mais detalhes. (O backend pode não ter retornado JSON válido).</p>`;
            }
            return;
        }

        const results = await response.json(); 

        if (results.length === 0) {
            notesContainer.innerHTML = '<p class="no-data-message">Você ainda não tem pacientes com consultas agendadas ou realizadas.</p>';
            return;
        }

        results.forEach(patient => {
            const noteCard = document.createElement('div');
            noteCard.classList.add('note-card');
            
            // Redirecionamento CORRIGIDO para a ficha.html
            const patientLink = `ficha.html?pacienteId=${patient.id_paciente}`;
            const patientName = patient.nome_paciente || 'Paciente Desconhecido';

            // Estrutura COPIADA de consultas.js: Usa um único <a> que cobre a área do nome + ícones
            noteCard.innerHTML = `
                <a href="${patientLink}" style="display: flex; flex-grow: 1; align-items: center; text-decoration: none; color: inherit; height: 100%;">
                    <h4 style="margin: 0; padding: 0;">${patientName}</h4>
                </a>
                <div class="note-buttons">
                  <button class="add-btn"><svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                  </svg></button>
                  <button class="trash-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg></button>
                </div>
            `;

            notesContainer.appendChild(noteCard);
        });
            
    } catch (error) {
        console.error('Erro de rede ou parsing ao carregar pacientes para anotações:', error);
        notesContainer.innerHTML = '<p class="error-message">Erro de conexão ou dados inválidos. Verifique se o backend está ativo e a URL da API está correta.</p>';
    }
}

// Inicia o carregamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    loadPatientNotesList();
});