document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const loginData = {
            email: emailInput.value,
            senha: passwordInput.value,
        };

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                console.log('Login realizado com sucesso:', result);
                alert('Login realizado com sucesso!');
                // Redirecionar para a página principal após o login
                window.location.href = 'index.html'; 
            } else {
                const error = await response.json();
                console.error('Erro ao fazer login:', error.error);
                alert('Erro ao fazer login: ' + error.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de conexão com o servidor.');
        }
    });
});