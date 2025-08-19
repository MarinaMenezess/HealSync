document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const birthdateInput = document.getElementById('birthdate');
    const genreSelect = document.getElementById('genre');
    const passwordInput = document.getElementById('password');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let generoValue = genreSelect.value.toLowerCase();
        if (generoValue === "prefiro não informar") {
            generoValue = "indefinido";
        }

        const userData = {
            nome: nameInput.value,
            email: emailInput.value,
            senha: passwordInput.value,
            data_nascimento: birthdateInput.value,
            genero: generoValue,
            is_psicologo: false,
            especialidade: null,
            contato: null,
        };

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Usuário cadastrado com sucesso:', result);
                alert('Cadastro realizado com sucesso!');
                window.location.href = 'login.html';
            } else {
                const error = await response.json();
                console.error('Erro ao cadastrar:', error.error);
                alert('Erro ao cadastrar: ' + error.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de conexão com o servidor.');
        }
    });
});