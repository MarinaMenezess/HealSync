document.addEventListener('DOMContentLoaded', () => {
    const newChatButton = document.querySelector('.new-chat-button');
    const chatInput = document.querySelector('.chat-input-area input');
    const sendButton = document.querySelector('.send-button');
    const chatMessagesContainer = document.querySelector('.chat-messages');
    const conversationList = document.querySelector('.conversation-list');

    // Estado da aplicação
    let currentConversationId = null;

    // Função para renderizar uma mensagem no chat
    function renderMessage(remetente, conteudo, dataHora) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', remetente === 'usuario' ? 'sent' : 'received');
        
        // Formata a data e a hora
        const date = new Date(dataHora);
        const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <p>${conteudo}</p>
            <span class="message-time">${timeString}</span>
        `;
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scrolla para a última mensagem
    }

    // Função para carregar e renderizar as conversas na sidebar
    async function loadConversations() {
        try {
            const response = await fetch('http://localhost:3000/ia/conversas', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const conversations = await response.json();
                renderConversationList(conversations);
                // Carrega a conversa mais recente por padrão
                if (conversations.length > 0) {
                    loadConversationMessages(conversations[0].id_conversa);
                }
            } else {
                console.error('Erro ao carregar conversas:', response.statusText);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
        }
    }

    // Função para renderizar a lista de conversas
    function renderConversationList(list) {
        conversationList.innerHTML = '';
        list.forEach(conv => {
            const li = document.createElement('li');
            li.classList.add('conversation-item');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = conv.titulo_opcional || `Conversa #${conv.id_conversa}`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                loadConversationMessages(conv.id_conversa);
            });
            li.appendChild(a);
            conversationList.appendChild(li);
        });
    }

    // Função para carregar as mensagens de uma conversa
    async function loadConversationMessages(id) {
        currentConversationId = id;
        chatMessagesContainer.innerHTML = ''; // Limpa o chat
        try {
            const response = await fetch(`http://localhost:3000/ia/conversas/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                messages.forEach(msg => renderMessage(msg.remetente, msg.conteudo, msg.data_hora));
                
                // Ativa a conversa na sidebar
                document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
                const activeItemLink = Array.from(conversationList.querySelectorAll('a')).find(a => a.textContent.includes(id));
                if (activeItemLink) {
                    activeItemLink.parentElement.classList.add('active');
                }
            } else {
                console.error('Erro ao carregar mensagens:', response.statusText);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
        }
    }

    // Função para enviar a mensagem para o servidor
    async function sendMessage(mensagem) {
        if (!currentConversationId) {
            alert('Por favor, inicie uma nova conversa.');
            return;
        }

        renderMessage('usuario', mensagem, new Date());

        try {
            const response = await fetch('http://localhost:3000/ia/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    id_conversa: currentConversationId,
                    mensagem_usuario: mensagem
                })
            });

            if (response.ok) {
                const data = await response.json();
                renderMessage('ia', data.resposta, new Date());
            } else {
                console.error('Erro ao enviar mensagem:', response.statusText);
                alert('Erro ao processar a resposta da IA.');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de conexão com o servidor.');
        }
    }

    // Evento de clique no botão de enviar
    sendButton.addEventListener('click', () => {
        const mensagem = chatInput.value.trim();
        if (mensagem) {
            sendMessage(mensagem);
            chatInput.value = '';
        }
    });

    // Evento de tecla 'Enter' no input
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const mensagem = chatInput.value.trim();
            if (mensagem) {
                sendMessage(mensagem);
                chatInput.value = '';
            }
        }
    });

    // Função para iniciar uma nova conversa
    newChatButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/ia/conversas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ titulo_opcional: 'Nova Conversa' })
            });

            if (response.ok) {
                const newConversation = await response.json();
                alert('Nova conversa iniciada!');
                loadConversations();
                loadConversationMessages(newConversation.id);
            } else {
                console.error('Erro ao iniciar nova conversa:', response.statusText);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    });

    // Chama a função para carregar as conversas quando a página carregar
    loadConversations();
});