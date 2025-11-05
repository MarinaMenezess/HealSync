// ARQUIVO: frontend/moderation.js (NOVO)

document.addEventListener('DOMContentLoaded', () => {
    // Usar o container principal para mostrar/esconder o modal
    const denounceModalContainer = document.getElementById('denounce-modal-container'); 
    const reportBtn = document.getElementById('report-profile-btn');
    
    // Elementos do novo modal
    const closeDenounceBtn = document.getElementById('close-denounce-modal-btn');
    const cancelDenounceBtn = document.getElementById('cancel-denounce-btn');
    const submitBtn = document.getElementById('submit-denounce-btn');
    
    const denounceForm = document.getElementById('denounce-form');
    const denounceReasonInput = document.getElementById('denounce-reason');

    const urlParams = new URLSearchParams(window.location.search);
    const userIdToDenounce = urlParams.get('id'); // ID do usuário que está sendo denunciado

    const API_BASE_URL = 'http://127.0.0.1:3000'; // Mantendo a consistência do IP
    
    // Função para abrir o modal
    function openDenounceModal() {
        if (denounceModalContainer) {
            denounceModalContainer.classList.add('active'); // Usa a classe 'active' do style.css
        }
    }

    // Função para fechar o modal
    function closeDenounceModal() {
        if (denounceModalContainer) {
            denounceModalContainer.classList.remove('active');
            denounceForm.reset(); // Limpa o formulário ao fechar
        }
    }

    // Eventos para abrir o modal
    if (reportBtn) {
        reportBtn.onclick = openDenounceModal;
    }

    // Eventos para fechar o modal
    if (closeDenounceBtn) {
        closeDenounceBtn.onclick = closeDenounceModal;
    }
    if (cancelDenounceBtn) {
        cancelDenounceBtn.onclick = closeDenounceModal;
    }

    // Fechar se clicar fora do conteúdo (clique no container principal)
    if (denounceModalContainer) {
        denounceModalContainer.addEventListener('click', function(event) {
            if (event.target === denounceModalContainer) {
                closeDenounceModal();
            }
        });
    }

    // Lógica de submissão do formulário de denúncia
    if (denounceForm) {
        denounceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const motivo = denounceReasonInput.value.trim();
            const token = localStorage.getItem('jwt'); // Lendo a chave correta 'jwt'
            
            if (!token) {
                alert("Sua sessão expirou. Faça login novamente para denunciar.");
                window.location.href = './login.html';
                return;
            }

            if (!userIdToDenounce) {
                alert("Erro: ID do perfil a ser denunciado não foi encontrado.");
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                const response = await fetch(`${API_BASE_URL}/users/${userIdToDenounce}/denounce-deactivate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`, 
                    },
                    body: JSON.stringify({ motivo: motivo }), 
                });

                const result = await response.json();
                
                if (response.ok) {
                    alert(`Denúncia enviada com sucesso! \n\n${result.mensagem}`);
                    closeDenounceModal(); 
                    
                    // Recarrega a página para atualizar o estado dos posts
                    window.location.reload(); 
                } else {
                    alert('Erro ao enviar denúncia: ' + (result.error || 'Erro desconhecido.'));
                }

            } catch (error) {
                console.error('Erro de rede ao denunciar:', error);
                alert('Erro de rede ou falha na comunicação com o servidor.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Denúncia e Inativar';
            }
        });
    }
});