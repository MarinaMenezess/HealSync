document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const email = emailInput.value.trim();
      const senha = passwordInput.value.trim();
  
      try {
        const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
  
        const data = await response.json();
  
        if (response.ok) {
          localStorage.setItem('token', data.token);
          alert('Login realizado com sucesso!');
          window.location.href = 'timeline.html'; // ou outra página protegida
        } else {
          alert(data.error || 'Erro ao fazer login');
        }
      } catch (err) {
        console.error('Erro de rede:', err);
        alert('Erro de rede. Tente novamente mais tarde.');
      }
    });
  });
  