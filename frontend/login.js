// ARQUIVO: frontend/login.js (CORRIGIDO PARA USAR FIREBASE)

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Assume-se que o objeto global 'firebase' e 'auth' (instância de firebase.auth()) estão disponíveis
    const auth = firebase.auth();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            // 1. AUTENTICAÇÃO NO FIREBASE CLIENTE
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. OBTÉM O TOKEN DE ID DO FIREBASE
            const firebaseIdToken = await user.getIdToken();

            // 3. ENVIA O TOKEN DO FIREBASE PARA O BACKEND
            // O backend verifica este token e retorna o JWT local e o perfil MySQL
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Envia o token Firebase que será verificado pelo backend (server.js)
                    'Authorization': `Bearer ${firebaseIdToken}`, 
                },
                // O corpo pode ser vazio, mas mantemos o email. O backend ignora a senha.
                body: JSON.stringify({ email: email }), 
            });

            if (response.ok) {
                const result = await response.json();
                
                // 4. ARMAZENA O JWT LOCAL (para uso nas APIs) e os dados do usuário.
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                console.log('Login realizado com sucesso. Token local JWT obtido:', result.token);
                alert('Login realizado com sucesso!');
                
                // Redirecionar para a página principal
                window.location.href = 'index.html'; 
            } else {
                const error = await response.json();
                console.error('Erro ao fazer login no backend:', error.error);
                // Erro comum aqui: "Perfil de usuário não encontrado no banco de dados."
                alert('Erro ao fazer login: ' + error.error);
            }
        } catch (error) {
            // Captura erros do Firebase (ex: senha errada, usuário não cadastrado)
            console.error('Erro de autenticação Firebase ou na requisição:', error);
            let errorMessage = 'Erro de login. Verifique e-mail e senha.';
            if (error.code) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                    errorMessage = 'Credenciais inválidas. Tente novamente.';
                }
            }
            alert(errorMessage);
        }
    });
});