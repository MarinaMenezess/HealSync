// signup.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const nameInput = document.querySelector('input[type="text"]');
    const emailInput = document.querySelector('input[type="email"]');
    const birthdateInput = document.querySelector('input[type="date"]'); // Adicionei a variável
    const genderSelect = document.querySelector('select[name="gender"]'); // Adicionei a variável
    const passwordInput = document.querySelectorAll('input[type="password"]')[0];
    const confirmPasswordInput = document.querySelectorAll('input[type="password"]')[1];
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const nome = nameInput.value.trim();
      const email = emailInput.value.trim();
      const senha = passwordInput.value.trim();
      const confirmarSenha = confirmPasswordInput.value.trim();
      const data_nascim = birthdateInput.value; // Pega o valor do campo de data
      const genero = genderSelect.value;       // Pega o valor selecionado
  
      if (senha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
      }
  
      const usuario = {
        nome,
        email,
        senha,
        data_nascim,
        genero
        // Removi a propriedade 'configuracoes_privacidade'
      };
  
      try {
        const response = await fetch('http://localhost:3000/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usuario)
        });
  
        const data = await response.json();
  
        if (response.ok) {
          alert('Cadastro realizado com sucesso!');
          window.location.href = 'login.html';
        } else {
          alert(data.error || 'Erro ao cadastrar usuário');
        }
      } catch (err) {
        console.error('Erro de rede:', err);
        alert('Erro de rede. Tente novamente mais tarde.');
      }
    });
  });