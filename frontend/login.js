// ARQUIVO: frontend/login.js (FINAL COM E-MAIL/SENHA, GOOGLE E FACEBOOK)

document.addEventListener('DOMContentLoaded', () => {
    // Elementos do formulário de E-mail/Senha
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Elementos de Login Social (Verificar se estes IDs estão no seu login.html)
    const googleLoginButton = document.getElementById('google-login-button');
    const facebookLoginButton = document.getElementById('facebook-login-button');

    // Assume-se que o objeto global 'firebase' e 'auth' estão disponíveis (inicializados no HTML)
    const auth = firebase.auth(); 
    
    // Provedores de Autenticação (CRUCIAL: Instanciar com 'new')
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    
    // CORREÇÃO FACEBOOK: Força a solicitação do escopo 'email', resolvendo o erro 1349048/Invalid Scopes
    facebookProvider.addScope('email'); 
    

    // ----------------------------------------------------
    // LÓGICA DE AUTENTICAÇÃO CENTRALIZADA (REUTILIZADA PARA TODAS AS FORMAS)
    // ----------------------------------------------------

    /**
     * Envia o token do Firebase para o Backend para autenticação local e obtenção do JWT.
     * @param {firebase.User} user - O objeto User retornado pelo Firebase.
     * @param {string} email - O email do usuário.
     * @param {string} [displayName=''] - O nome de exibição do usuário.
     */
    async function authenticateInBackend(user, email, displayName = '') {
        try {
            const firebaseIdToken = await user.getIdToken();

            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Envia o token Firebase que será verificado pelo backend (server.js)
                    'Authorization': `Bearer ${firebaseIdToken}`, 
                },
                // O backend utiliza o email/nome para buscar o perfil no MySQL
                body: JSON.stringify({ email: email, name: displayName }), 
            });

            if (response.ok) {
                const result = await response.json();
                
                // 4. ARMAZENA O JWT LOCAL (para uso nas APIs) e os dados do usuário.
                // CORREÇÃO APLICADA: O token deve ser salvo como 'jwt'
                localStorage.setItem('jwt', result.token); 
                localStorage.setItem('user', JSON.stringify(result.user));
                
                console.log('Login realizado com sucesso. Token local JWT obtido.');
                alert('Login realizado com sucesso!');
                
                // Redirecionar para a página principal
                window.location.href = 'index.html'; 
            } else {
                const error = await response.json();
                console.error('Erro ao fazer login no backend:', error.error);
                // Erro comum aqui: "Perfil de usuário não encontrado no banco de dados. Conclua o cadastro."
                alert('Erro ao fazer login: ' + error.error);
            }
        } catch (error) {
            console.error('Erro de rede ou backend:', error);
            alert('Erro de rede ou falha na comunicação com o servidor.');
        }
    }


    // ----------------------------------------------------
    // 1. LÓGICA DE LOGIN POR E-MAIL E SENHA
    // ----------------------------------------------------

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            // 1. AUTENTICAÇÃO NO FIREBASE CLIENTE
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. CHAMA A LÓGICA CENTRALIZADA
            // No login por email/senha, não temos o nome garantido, usamos o email como fallback
            await authenticateInBackend(user, email, user.displayName || email);
            
        } catch (error) {
            console.error('Erro de autenticação Firebase:', error);
            let errorMessage = 'Erro de login. Verifique e-mail e senha.';
            if (error.code) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                    errorMessage = 'Credenciais inválidas. Tente novamente.';
                }
            }
            alert(errorMessage);
        }
    });

    // ----------------------------------------------------
    // 2. LÓGICA DE LOGIN COM GOOGLE
    // ----------------------------------------------------

    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            try {
                const result = await auth.signInWithPopup(googleProvider);
                const user = result.user;
                await authenticateInBackend(user, user.email, user.displayName);
            } catch (error) {
                console.error('Erro de autenticação Google Firebase:', error);
                let errorMessage = 'Erro no login com Google.';
                if (error.code) {
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Login cancelado pelo usuário.';
                    } else if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage = 'Este e-mail já está cadastrado com outro método de login. Use o provedor original.';
                    } else if (error.message) {
                        errorMessage = `Erro de autenticação: ${error.message}`;
                    }
                }
                alert(errorMessage);
            }
        });
    }

    // ----------------------------------------------------
    // 3. LÓGICA DE LOGIN COM FACEBOOK
    // ----------------------------------------------------

    if (facebookLoginButton) {
        facebookLoginButton.addEventListener('click', async () => {
            try {
                // 1. AUTENTICAÇÃO NO FIREBASE COM POPUP
                const result = await auth.signInWithPopup(facebookProvider);
                const user = result.user;

                // 2. CHAMA A LÓGICA CENTRALIZADA DE AUTENTICAÇÃO NO BACKEND
                await authenticateInBackend(user, user.email, user.displayName);

            } catch (error) {
                console.error('Erro de autenticação Facebook Firebase:', error);
                let errorMessage = 'Erro no login com Facebook.';
                
                if (error.code && error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Login cancelado pelo usuário.';
                } else if (error.code && error.code === 'auth/account-exists-with-different-credential') {
                     errorMessage = 'Este e-mail já está cadastrado com outro método de login. Use o provedor original.';
                } else if (error.message) {
                    errorMessage = `Erro de autenticação: ${error.message}`;
                }
                alert(errorMessage);
            }
        });
    }
});