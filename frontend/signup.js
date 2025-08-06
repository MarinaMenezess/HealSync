document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Captura os campos
    const nome = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const genero = form.querySelector('#genre').value;
    const data_nascimento = form.querySelector('#birthdate').value;
    const senha = form.querySelector('#password').value;

    // Monta o objeto de envio
    const dados = {
      nome,
      email,
      senha,
      genero,
      data_nascimento,
      is_psicologo: 0,              // padrão: paciente
      especialidade: null,          // campo reservado para psicólogo
      contato: null                 // opcional
    };

    try {
      const resposta = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        alert("Cadastro realizado com sucesso!");
        window.location.href = "login.html";
      } else {
        alert(`Erro: ${resultado.error || 'Não foi possível cadastrar.'}`);
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      alert("Erro na conexão com o servidor.");
    }
  });
});
