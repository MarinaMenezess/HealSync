document.addEventListener('DOMContentLoaded', () => {
  // Seu código existente para converter input em textarea
  const container = document.querySelector('.comentar');
  if (container) {
    const initialInput = document.querySelector('.comentar input');

    const toTextarea = () => {
      if (container.querySelector('textarea')) return;
      const inputElement = container.querySelector('input');
      const textareaElement = document.createElement('textarea');
      textareaElement.placeholder = inputElement.placeholder;
      textareaElement.className = 'comentar-textarea';
      textareaElement.value = inputElement.value;
      textareaElement.rows = "3";
      textareaElement.style.height = 'auto';
      textareaElement.style.height = (textareaElement.scrollHeight) + 'px';
      container.replaceChild(textareaElement, inputElement);
      textareaElement.focus();
      textareaElement.addEventListener('blur', toInput);
    };

    const toInput = () => {
      if (container.querySelector('input')) return;
      const textareaElement = container.querySelector('textarea');
      const inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.placeholder = textareaElement.placeholder;
      inputElement.className = 'comentar-input';
      inputElement.value = textareaElement.value;
      container.replaceChild(inputElement, textareaElement);
      inputElement.addEventListener('focus', toTextarea);
    };

    if(initialInput) {
        initialInput.addEventListener('focus', toTextarea);
    }
  }

  // Código para o formulário de registro
  const registerForm = document.getElementById('register-form'); // Assumindo que seu formulário tem o id="register-form"

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      // Converte 'is_psicologo' para booleano
      data.is_psicologo = data.is_psicologo === 'on';

      try {
        const response = await fetch('http://localhost:3000/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Registro bem-sucedido:', result);
          // Redirecionar para a página de login ou mostrar uma mensagem de sucesso
          window.location.href = 'login.html';
        } else {
          const error = await response.json();
          console.error('Erro no registro:', error.error);
          // Mostrar uma mensagem de erro para o usuário
          alert(`Erro no registro: ${error.error}`);
        }
      } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
      }
    });
  }
});