// ARQUIVO: frontend/signup.js (FINAL COM E-MAIL/SENHA, GOOGLE E FACEBOOK)

document.addEventListener('DOMContentLoaded', () => {
    // Elementos de Cadastro por Email/Senha
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    // Assumimos que o campo de Nome tem o ID 'name' no seu formulário de cadastro
    const nameInput = document.getElementById('name'); 

    // Elementos de Cadastro Social (Verificar se estes IDs estão no seu signup.html)
    const googleSignupButton = document.getElementById('google-signup-button');
    const facebookSignupButton = document.getElementById('facebook-signup-button');

    // Assume-se que o objeto global 'firebase' e 'auth' estão disponíveis (inicializados no HTML)
    const auth = firebase.auth(); 

    // Provedores de Autenticação (CRUCIAL: Instanciar com 'new')
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    
    // CORREÇÃO FACEBOOK: Força a solicitação do escopo 'email', resolvendo o erro 'Invalid Scopes: email'
    facebookProvider.addScope('email'); 

    // ----------------------------------------------------
    // LÓGICA DE REGISTRO CENTRALIZADA (REUTILIZADA)
    // ----------------------------------------------------

    /**
     * Envia o token do Firebase para o Backend para registrar o usuário.
     * @param {firebase.User} user - O objeto User retornado pelo Firebase.
     * @param {string} email - O email do usuário.
     * @param {string} displayName - O nome do usuário.
     */
    async function registerInBackend(user, email, displayName) {
        let profileRegistered = false;
        try {
            const firebaseIdToken = await user.getIdToken();

            // Chamada para a rota /register no backend
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${firebaseIdToken}`, 
                },
                // Passa o nome e email (o backend usará esses dados do token verificado)
                body: JSON.stringify({ email: email, name: displayName }), 
            });

            if (response.ok || response.status === 409) {
                // 409 (Conflict) significa que o usuário já estava no MySQL
                const result = await response.json();
                profileRegistered = true;
                
                alert('Cadastro realizado com sucesso! Prossiga para o login.');
                window.location.href = 'login.html'; 
            } else {
                const error = await response.json();
                console.error('Erro ao registrar no backend:', error.error);
                alert('Erro ao cadastrar: ' + error.error);
                
                // Se o backend falhar, remove o usuário do Firebase
                await user.delete(); 
            }
        } catch (error) {
            console.error('Erro de rede ou backend:', error);
            alert('Erro de rede. Tente novamente mais tarde.');
            
            // Se o usuário foi criado no Firebase mas falhou no backend, remova-o
            if (!profileRegistered && user) {
                await user.delete();
            }
        }
    }


    // ----------------------------------------------------
    // 1. LÓGICA DE CADASTRO POR E-MAIL E SENHA
    // ----------------------------------------------------

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;
        const name = nameInput ? nameInput.value : email; 

        try {
            // 1. CRIAÇÃO DE CONTA NO FIREBASE CLIENTE
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. ATUALIZA O PERFIL (Adiciona o nome de exibição)
            await user.updateProfile({ displayName: name });
            
            // 3. CHAMA A LÓGICA CENTRALIZADA PARA REGISTRAR NO BACKEND
            await registerInBackend(user, email, name);

        } catch (error) {
            console.error('Erro de autenticação Firebase no cadastro:', error);
            let errorMessage = 'Erro no cadastro. Tente novamente.';
            if (error.code && error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este e-mail já está em uso.';
            }
            alert(errorMessage);
        }
    });

    // ----------------------------------------------------
    // 2. LÓGICA DE CADASTRO COM GOOGLE
    // ----------------------------------------------------

    if (googleSignupButton) {
        googleSignupButton.addEventListener('click', async () => {
            try {
                // 1. AUTENTICAÇÃO NO FIREBASE COM POPUP
                const result = await auth.signInWithPopup(googleProvider);
                const user = result.user;
                
                // 2. CHAMA A LÓGICA CENTRALIZADA PARA REGISTRAR NO BACKEND
                await registerInBackend(user, user.email, user.displayName);

            } catch (error) {
                console.error('Erro de autenticação Google Firebase:', error);
                let errorMessage = 'Erro no cadastro com Google.';
                
                if (error.code && error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Cadastro cancelado pelo usuário.';
                } else if (error.code && error.code === 'auth/account-exists-with-different-credential') {
                    errorMessage = 'Este e-mail já está cadastrado. Redirecionando para o login...';
                    alert(errorMessage);
                    window.location.href = 'login.html';
                    return;
                } else if (error.message) {
                    errorMessage = `Erro de autenticação: ${error.message}`;
                }
                alert(errorMessage);
            }
        });
    }


    // ----------------------------------------------------
    // 3. LÓGICA DE CADASTRO COM FACEBOOK
    // ----------------------------------------------------

    if (facebookSignupButton) {
        facebookSignupButton.addEventListener('click', async () => {
            try {
                // 1. AUTENTICAÇÃO NO FIREBASE COM POPUP
                const result = await auth.signInWithPopup(facebookProvider);
                const user = result.user;
                
                // 2. CHAMA A LÓGICA CENTRALIZADA PARA REGISTRAR NO BACKEND
                await registerInBackend(user, user.email, user.displayName);

            } catch (error) {
                console.error('Erro de autenticação Facebook Firebase:', error);
                let errorMessage = 'Erro no cadastro com Facebook.';
                
                if (error.code && error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Cadastro cancelado pelo usuário.';
                } else if (error.code && error.code === 'auth/account-exists-with-different-credential') {
                    errorMessage = 'Este e-mail já está cadastrado. Redirecionando para o login...';
                    alert(errorMessage);
                    window.location.href = 'login.html';
                    return;
                } else if (error.message) {
                    errorMessage = `Erro de autenticação: ${error.message}`;
                }
                alert(errorMessage);
            }
        });
    }
});