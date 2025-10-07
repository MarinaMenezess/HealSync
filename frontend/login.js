// ARQUIVO: frontend/login.js (CORRIGIDO: ADICIONADO TRATAMENTO DE ERRO DE CONTA JÁ EXISTENTE PARA VINCULAÇÃO)

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const googleLoginBtn = document.getElementById('google-login-btn'); 

    // Assume-se que o objeto global 'firebase' e 'auth' (instância de firebase.auth()) estão disponíveis
    const auth = firebase.auth();

    /**
     * Lida com o login bem-sucedido no Firebase e chama o backend para obter o JWT local.
     * @param {firebase.User} user O objeto User retornado pelo Firebase.
     */
    async function handleSuccessfulFirebaseLogin(user) {
        try {
            // 2. OBTÉM O TOKEN DE ID DO FIREBASE
            const firebaseIdToken = await user.getIdToken();

            // 3. ENVIA O TOKEN DO FIREBASE PARA O BACKEND
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Envia o token Firebase que será verificado pelo backend (server.js)
                    'Authorization': `Bearer ${firebaseIdToken}`, 
                },
                // O corpo pode ser vazio, mas mantemos o email para referência no backend.
                body: JSON.stringify({ email: user.email || user.uid }), 
            });

            if (response.ok) {
                const result = await response.json();
                
                // 4. ARMAZENA O JWT LOCAL (para uso nas APIs) e os dados do usuário.
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                console.log('Login/Cadastro realizado com sucesso. Token local JWT obtido:', result.token);
                alert('Login/Cadastro realizado com sucesso!');
                
                // Redirecionar para a página principal
                window.location.href = 'index.html'; 
            } else {
                const error = await response.json();
                console.error('Erro ao fazer login no backend:', error.error);
                alert('Erro ao fazer login: ' + error.error + '. Por favor, tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao processar o login com o backend:', error);
            alert('Erro inesperado ao processar o login. Tente novamente.');
            // Opcional: Deslogar do Firebase se o backend falhar para evitar estado inconsistente.
            auth.signOut();
        }
    }


    // 1. LÓGICA DE LOGIN COM EMAIL/SENHA
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            // 1. AUTENTICAÇÃO NO FIREBASE CLIENTE
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            await handleSuccessfulFirebaseLogin(userCredential.user);

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
    
    
    // 2. LÓGICA DE LOGIN COM GOOGLE
    if (googleLoginBtn) {
        const googleProvider = new firebase.auth.GoogleAuthProvider();
        
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                // Tenta fazer o login com popup do Google
                const result = await auth.signInWithPopup(googleProvider);
                await handleSuccessfulFirebaseLogin(result.user);

            } catch (error) {
                console.error('Erro de autenticação com Google:', error);
                let errorMessage = 'Erro ao tentar realizar login com Google.';
                
                // --- NOVO TRATAMENTO DE ERRO DE CONTA JÁ EXISTENTE ---
                if (error.code === 'auth/account-exists-with-different-credential') {
                    const pendingCredential = error.credential;
                    const email = error.email;
                    
                    // 1. Pede para o Firebase quais provedores estão ligados ao e-mail
                    try {
                        const methods = await auth.fetchSignInMethodsForEmail(email);
                        const primaryProvider = methods[0];
                        
                        // 2. Sugere que o usuário faça login com o provedor existente
                        alert(`Uma conta já existe com este e-mail (${email}) usando o provedor: ${primaryProvider}. Por favor, faça login com o provedor original.`);
                        
                        // ******* Ponto chave para vinculação *******
                        // O fluxo ideal é:
                        // 1. Notificar o usuário e pedir para ele logar com o provedor existente (ex: e-mail/senha).
                        // 2. Após logar com o provedor existente, vincular a nova credencial (Google) à conta.
                        
                        // Para simplificar, vamos pedir para ele tentar o login com email/senha (ou outro)
                        errorMessage = `Uma conta já existe para ${email}. Por favor, use a opção de login/senha para entrar, ou tente com outro e-mail.`;
                        
                    } catch (fetchError) {
                        console.error("Erro ao buscar provedores de login:", fetchError);
                        errorMessage = 'Erro interno. Não foi possível verificar o provedor original da conta.';
                    }
                } else if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'O pop-up de login do Google foi fechado.';
                } else if (error.message) {
                    errorMessage = 'Erro: ' + error.message;
                }
                // --- FIM DO NOVO TRATAMENTO DE ERRO ---

                alert(errorMessage);
            }
        });
    }

});