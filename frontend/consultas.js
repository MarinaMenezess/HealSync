let currentRequestId = null;

function openReasonModal(requestId) {
    const reasonModalContainer = document.getElementById('reason-modal-container');
    reasonModalContainer.classList.add('active');
    currentRequestId = requestId;
    const form = document.getElementById('reason-form');
    form.removeEventListener('submit', handleReasonSubmit);
    form.addEventListener('submit', handleReasonSubmit);
}

function handleReasonSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const textarea = form.querySelector('#reason-textarea');
    const reason = textarea.value;

    if (!reason) {
        alert('Por favor, insira o motivo da recusa.');
        return;
    }

    console.log(`Recusando solicitação ${currentRequestId} com o motivo: ${reason}`);
    alert('Solicitação recusada com sucesso!');
    closeReasonModal();
    window.location.reload();
}

function closeReasonModal() {
    const reasonModalContainer = document.getElementById('reason-modal-container');
    reasonModalContainer.classList.remove('active');
    document.getElementById('reason-form').reset();
    const form = document.getElementById('reason-form');
    form.removeEventListener('submit', handleReasonSubmit);
}

// Lógica principal de roteamento e exibição de seções
document.addEventListener('DOMContentLoaded', () => {
    const requestsDropdownToggle = document.getElementById('requests-dropdown-toggle');
    const requestsDropdown = document.querySelector('.requests-dropdown');
    const requestsTitle = document.querySelector('.requests-title');
    
    // Mapeamento de hash para ID da seção e título
    const hashToSection = {
        'solicitacoes': { id: 'requests-content', title: 'Solicitações' },
        'anotacoes': { id: 'notes-content', title: 'Anotações' },
        'agenda': { id: 'agenda-content', title: 'Agenda' }
    };

    function handleHashChange() {
        // Obtém o hash da URL, removendo o '#' inicial. O padrão é 'agenda' se não houver hash.
        const hash = window.location.hash ? window.location.hash.substring(1) : 'agenda';
        const sectionData = hashToSection[hash];

        if (sectionData) {
            // Oculta todas as seções
            document.querySelectorAll('.requests-container, .agenda-container, .notes-container').forEach(section => {
                section.classList.add('hidden-section');
            });

            // Exibe a seção correspondente ao hash
            const targetSection = document.getElementById(sectionData.id);
            if (targetSection) {
                targetSection.classList.remove('hidden-section');
            }

            // Atualiza o título do header
            if (requestsTitle) {
                requestsTitle.textContent = sectionData.title;
            }
        }
    }

    // Configuração inicial do dropdown
    if (requestsDropdownToggle && requestsDropdown) {
        requestsDropdownToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            requestsDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (event) => {
            if (!requestsDropdown.contains(event.target) && !requestsDropdownToggle.contains(event.target)) {
                requestsDropdown.classList.remove('show');
            }
        });
    }

    // Gerencia o fechamento do modal de motivo de recusa
    const reasonModalContainer = document.getElementById('reason-modal-container');
    const closeModalButton = document.getElementById('close-reason-modal-btn');
    const cancelReasonButton = document.getElementById('cancel-reason-btn');

    if (reasonModalContainer) {
        closeModalButton.addEventListener('click', closeReasonModal);
        cancelReasonButton.addEventListener('click', closeReasonModal);
    
        reasonModalContainer.addEventListener('click', (e) => {
            if (e.target.id === 'reason-modal-container') {
                closeReasonModal();
            }
        });
    }
    
    // Evento para quando o hash da URL muda.
    window.addEventListener('hashchange', handleHashChange);

    // Chama a função de manipulação do hash na carga inicial da página
    handleHashChange();
});