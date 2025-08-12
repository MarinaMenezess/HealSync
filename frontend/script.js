function openModal() {
    // Cria o container principal do modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    modalContainer.classList.add('active');

    // Adiciona o conteúdo HTML do modal
    modalContainer.innerHTML = `
      <div id="modal">
        <div class="modal-header">
          <h1 class="modal-title">Novo Registro</h1>
          <button id="close-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form>
            <div class="form-group">
              <label for="modal-title-input">Título</label>
              <input type="text" id="modal-title-input">
            </div>
            <div class="form-group">
              <label for="modal-content-textarea">Conteúdo</label>
              <textarea id="modal-content-textarea"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="close-btn-modal">Fechar</button>
          <button id="create-btn-modal">Criar</button>
        </div>
      </div>
    `;

    // Insere o modal no corpo do documento
    document.body.appendChild(modalContainer);

    // Adiciona os eventos de fechar o modal
    const closeModalButton = document.getElementById('close-modal-btn');
    const closeBtnModal = document.getElementById('close-btn-modal');
    
    function closeModal() {
      // Remove o modal do DOM
      document.body.removeChild(modalContainer);
    }

    closeModalButton.addEventListener('click', closeModal);
    closeBtnModal.addEventListener('click', closeModal);

    // Fechar o modal ao clicar fora dele
    modalContainer.addEventListener('click', (e) => {
      if (e.target.id === 'modal-container') {
        closeModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    let dropdownToggle = document.getElementById('dropdownToggle');
    let dropdownMenu = document.getElementById('dropdownMenu');

    function toggleDropdown() {
        dropdownMenu.classList.toggle('active');
    }

    function hideDropdown() {
        dropdownMenu.classList.remove('active');
    }

    dropdownToggle.addEventListener('click', (event) => {
        event.preventDefault(); // Impede a navegação
        event.stopPropagation(); // Impede o clique de ser propagado para o documento
        toggleDropdown();
    });

    // Ocultar o dropdown quando um item é clicado (opcional)
    dropdownMenu.querySelectorAll('.notification-item, .view-all-btn').forEach((item) => {
        item.addEventListener('click', () => {
            hideDropdown();
        });
    });

    // Ocultar o dropdown quando clicar fora dele
    document.addEventListener('click', (event) => {
        if (!dropdownMenu.contains(event.target) && !dropdownToggle.contains(event.target)) {
            hideDropdown();
        }
    });
});