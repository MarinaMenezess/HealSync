document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.comentar');
  const initialInput = document.querySelector('.comentar input');

  // Função para converter o input para textarea
  const toTextarea = () => {
    // Evita múltiplas conversões se já for um textarea
    if (container.querySelector('textarea')) return;

    // Pega o input atual
    const inputElement = container.querySelector('input');
    
    // Cria um novo elemento textarea
    const textareaElement = document.createElement('textarea');

    // Copia os atributos do input para o textarea
    textareaElement.placeholder = inputElement.placeholder;
    textareaElement.className = 'comentar-textarea'; // Use uma nova classe para estilizar
    textareaElement.value = inputElement.value;
    textareaElement.rows = "3"; // Define o número de linhas para começar
    textareaElement.style.height = 'auto'; // Reseta a altura para calcular o scrollHeight
    textareaElement.style.height = (textareaElement.scrollHeight) + 'px'; // Ajusta a altura

    // Substitui o input pelo textarea
    container.replaceChild(textareaElement, inputElement);

    // Foca no novo elemento textarea
    textareaElement.focus();

    // Adiciona o evento de perda de foco para reverter
    textareaElement.addEventListener('blur', toInput);
  };

  // Função para converter o textarea de volta para input
  const toInput = () => {
    // Evita múltiplas conversões se já for um input
    if (container.querySelector('input')) return;

    // Pega o textarea atual
    const textareaElement = container.querySelector('textarea');
    
    // Cria um novo elemento input
    const inputElement = document.createElement('input');
    inputElement.type = 'text';

    // Copia os atributos do textarea para o input
    inputElement.placeholder = textareaElement.placeholder;
    inputElement.className = 'comentar-input'; // Use a classe original ou uma nova
    inputElement.value = textareaElement.value;

    // Substitui o textarea pelo input
    container.replaceChild(inputElement, textareaElement);
    
    // Adiciona o evento de foco de volta para o input
    inputElement.addEventListener('focus', toTextarea);
  };

  // Evento inicial: ao focar no input, ele se transforma em textarea
  initialInput.addEventListener('focus', toTextarea);
});