// frontend/register.js (Usando o SDK Modular do Firebase)

// Importa as funções necessárias do SDK
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
// getAnalytics não é necessário para esta lógica de registro, então foi removido.

// Sua configuração do Firebase (fornecida pelo Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBzkSk84GLdKeEkLyUOStXtYHr5tfpJBak",
  authDomain: "healsync-cd5a6.firebaseapp.com",
  projectId: "healsync-cd5a6",
  storageBucket: "healsync-cd5a6.firebasestorage.app",
  messagingSenderId: "133723858575",
  appId: "1:133723858575:web:1fc432b178c1fbf7e2b2fa",
  measurementId: "G-3B9V19FSGF"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Obtém a instância do serviço de autenticação

document.addEventListener('DOMContentLoaded', () => {
  // Seu código existente para converter input em textarea (mantido)
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
  const registerForm = document.getElementById('register-form'); 

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      const email = data.email;
      const senha = data.senha; 
      const isPsicologoBoolean = data.is_psicologo === 'on';

      let firebaseIdToken = null;

      try {
        // ----------------------------------------------------
        // ETAPA 1: REGISTRO NO FIREBASE AUTHENTICATION
        // Usa a função modular 'createUserWithEmailAndPassword'
        // ----------------------------------------------------
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const firebaseUser = userCredential.user;
        
        // Obtém o ID Token para enviar ao seu backend
        firebaseIdToken = await firebaseUser.getIdToken();
        
        // ----------------------------------------------------
        // FIM DA ETAPA 1
        // ----------------------------------------------------

        // Prepara os dados do perfil para o backend (MySQL)
        const profileData = {
          nome: data.nome,
          email: email, 
          data_nascimento: data.data_nascimento,
          genero: data.genero,
          is_psicologo: isPsicologoBoolean,
          especialidade: data.especialidade,
          contato: data.contato
        };

        // ----------------------------------------------------
        // ETAPA 2: REGISTRO DO PERFIL NO BACKEND (MySQL)
        // ----------------------------------------------------
        const response = await fetch('http://localhost:3000/register-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Envia o token do Firebase no cabeçalho 'Authorization'
            'Authorization': `Bearer ${firebaseIdToken}` 
          },
          body: JSON.stringify(profileData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Registro de perfil bem-sucedido (MySQL):', result);
          // Redirecionar para a página de login
          window.location.href = 'login.html';
        } else {
          const error = await response.json();
          console.error('Erro no registro do perfil (Backend):', error.error);
          
          // Se o perfil falhar, notifica o usuário
          alert(`Erro no registro do perfil: ${error.error}. Por favor, tente novamente.`);
        }
      } catch (error) {
        // Captura erros do Firebase Auth (ex: e-mail já em uso, senha fraca) ou da requisição
        let errorMessage = 'Erro desconhecido durante o registro.';
        
        // Tratar erros comuns do Firebase Auth
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'O e-mail fornecido já está em uso.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'O formato do e-mail é inválido.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
                    break;
                default:
                    errorMessage = `Erro de Autenticação: ${error.message}`;
            }
        } else {
             // Outros erros de rede ou de código
             errorMessage = `Erro na requisição: ${error.message || 'Não foi possível conectar ao servidor.'}`;
        }

        console.error('Erro de Autenticação/Requisição:', error);
        alert(errorMessage);
      }
    });
  }
});