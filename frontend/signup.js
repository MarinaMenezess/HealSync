// ARQUIVO: frontend/signup.js (CORRIGIDO)

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const birthdateInput = document.getElementById('birthdate');
    const genreSelect = document.getElementById('genre');
    const passwordInput = document.getElementById('password');
    // Campo opcional para psicólogo
    const especialidadeInput = document.getElementById('especialidade');
    const contatoInput = document.getElementById('contato');

    // Inicializa a autenticação do Firebase (assume que o Firebase SDK está carregado no HTML)
    const auth = firebase.auth(); 

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;
        
        let generoValue = genreSelect.value.toLowerCase();
        if (generoValue === "prefiro não informar") {
            generoValue = "indefinido";
        }
        
        // 1. AUTENTICAÇÃO NO FIREBASE (Cria o usuário e obtém o Firebase ID Token)
        let firebaseIdToken;
        let firebaseUser;
        try {
            // Cria a conta do usuário no Firebase
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            firebaseUser = userCredential.user;
            
            // Obtém o token de ID do Firebase para provar a autenticação ao backend
            firebaseIdToken = await firebaseUser.getIdToken();
            
        } catch (error) {
            console.error('Erro de autenticação Firebase:', error);
            // Informa erros específicos do Firebase (ex: e-mail já em uso, senha fraca)
            alert('Erro no cadastro (Firebase): ' + error.message);
            return;
        }


        // 2. ENVIA OS DADOS DO PERFIL PARA O BACKEND (usando o token Firebase)
        const userData = {
            nome: nameInput.value,
            // O email será extraído do token do Firebase no backend, mas mantemos aqui por consistência
            email: email, 
            // A senha NÃO é enviada, pois é gerenciada pelo Firebase
            data_nascimento: birthdateInput.value,
            genero: generoValue,
            // Adicione a lógica para determinar se é psicólogo, se necessário
            is_psicologo: false, 
            especialidade: especialidadeInput ? especialidadeInput.value : null,
            contato: contatoInput ? contatoInput.value : null,
        };

        try {
            // O endpoint correto é /register-profile, conforme o backend/server.js
            const response = await fetch('http://localhost:3000/register-profile', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // O backend espera o token do Firebase no header Authorization
                    'Authorization': `Bearer ${firebaseIdToken}`, 
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Perfil de usuário cadastrado com sucesso no MySQL:', result);
                alert('Cadastro realizado com sucesso! Faça login.');
                window.location.href = 'login.html';
            } else {
                const error = await response.json();
                console.error('Erro ao cadastrar perfil no backend:', error.error);
                alert('Erro ao cadastrar perfil: ' + error.error);
                
                // Opcional: Remover o usuário do Firebase se o cadastro no MySQL falhar
                // await firebaseUser.delete();
            }
        } catch (error) {
            console.error('Erro na requisição ao backend:', error);
            alert('Erro de conexão com o servidor ou resposta inválida.');
        }
    });
});