// server.js
const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// Configuração CORS explícita para permitir a origem do seu frontend
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));

// Middleware de autenticação JWT (exemplo simples)
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, 'chave'); // trocar pela chave 
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

///////////////////////
// ROTAS USUÁRIO
///////////////////////

// Cadastro usuário
app.post('/usuarios', async (req, res) => {
  try {
    const { nome, email, senha, data_nascim, genero } = req.body;
    console.log(req.body);

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const hashedPwd = await bcrypt.hash(senha, 10);

    const sql = 'INSERT INTO usuario (Nome, Email, Senha, Data_Nascim, Genero) VALUES (?, ?, ?, ?, ?)';
    const values = [nome, email, hashedPwd, data_nascim ?? null, genero ?? null];

    const results = connection.execute(sql, values);

    return res.status(201).json({ message: 'Usuário criado', id: results.insertId });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro ao criar usuário', detalhes: err.message });
  }
});


// Login usuário
app.post('/login', async (req, res) => {
  
});

// Obter perfil do usuário (com autenticação)
app.get('/usuarios/:id', authMiddleware, async (req, res) => {
  
});

// Atualizar perfil do usuário
app.put('/usuarios/:id', authMiddleware, async (req, res) => {
  
});

// Excluir usuário
app.delete('/usuarios/:id', authMiddleware, async (req, res) => {
  
});

///////////////////////
// ROTAS PSICÓLOGO
///////////////////////

app.get('/psicologos', async (req, res) => {
  
});

app.get('/psicologos/:id', async (req, res) => {
 
});

app.post('/psicologos', async (req, res) => {
  
});

app.put('/psicologos/:id', async (req, res) => {
  
});

app.delete('/psicologos/:id', async (req, res) => {
  
});

///////////////////////
// ROTAS CONSULTAS
///////////////////////

app.get('/consultas', async (req, res) => {
  
});

app.get('/consultas/:id', async (req, res) => {
  
});

app.post('/consultas', async (req, res) => {
  
});

app.put('/consultas/:id', async (req, res) => {
 
});

app.delete('/consultas/:id', async (req, res) => {
  
});

// Consultas de um usuário
app.get('/usuarios/:id/consultas', async (req, res) => {
  
});

///////////////////////
// ROTAS REGISTRO DE PROGRESSO
///////////////////////

app.get('/usuarios/:id/registros', async (req, res) => {
  
});

app.post('/usuarios/:id/registros', async (req, res) => {
  
});

app.put('/registros/:id', async (req, res) => {
  
});

app.delete('/registros/:id', async (req, res) => {
  
});

///////////////////////
// ROTAS MENSAGENS
///////////////////////

app.get('/usuarios/:id/mensagens', async (req, res) => {
  
});

app.post('/mensagens', async (req, res) => {
  
});

///////////////////////
// ROTAS INTERAÇÕES
///////////////////////

app.get('/usuarios/:id/interacoes', async (req, res) => {
  
});

app.post('/interacoes', async (req, res) => {
  
});

///////////////////////
// ROTA SAÚDE - rota base
///////////////////////
app.get('/', (req, res) => {
  res.send('API HealSync rodando...');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
