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

// 1. Criar usuário
app.post('/usuario', async (req, res) => {
  const { Nome, Email, Senha, Data_Nascim, Genero, Eh_Psicologo } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO usuario (Nome, Email, Senha, Data_Nascim, Genero, Eh_Psicologo) VALUES (?, ?, ?, ?, ?, ?)',
      [Nome, Email, Senha, Data_Nascim, Genero, Eh_Psicologo]
    );
    res.status(201).json({ message: 'Usuário criado', ID_Usuario: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: err });
  }
});

// 2. Editar usuário
app.put('/usuario/:id', async (req, res) => {
  const { id } = req.params;
  const { Nome, Email, Senha, Data_Nascim, Genero, Eh_Psicologo } = req.body;
  try {
    await connection.execute(
      'UPDATE usuario SET Nome=?, Email=?, Senha=?, Data_Nascim=?, Genero=?, Eh_Psicologo=? WHERE ID_Usuario=?',
      [Nome, Email, Senha, Data_Nascim, Genero, Eh_Psicologo, id]
    );
    res.json({ message: 'Usuário atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar', details: err });
  }
});

// 3. Excluir usuário
app.delete('/usuario/:id', async (req, res) => {
  try {
    await connection.execute('DELETE FROM usuario WHERE ID_Usuario = ?', [req.params.id]);
    res.json({ message: 'Usuário excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir', details: err });
  }
});

// 4. Definir dados de psicólogo
app.post('/psicologo', async (req, res) => {
  const { ID_Usuario, Especialidade, Contato } = req.body;
  try {
    await connection.execute(
      'INSERT INTO dados_psicologo (ID_Psicologo, Especialidade, Contato) VALUES (?, ?, ?)',
      [ID_Usuario, Especialidade, Contato]
    );
    res.status(201).json({ message: 'Psicólogo registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar psicólogo', details: err });
  }
});

// 5. Agendar consulta
app.post('/consulta', async (req, res) => {
  const { ID_Usuario, ID_Psicologo, Data_Hora } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO consulta (ID_Usuario, ID_Psicologo, Data_Hora, Status) VALUES (?, ?, ?, "Agendada")',
      [ID_Usuario, ID_Psicologo, Data_Hora]
    );
    res.status(201).json({ message: 'Consulta agendada', ID_Consulta: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao agendar', details: err });
  }
});

// 6. Atualizar status da consulta (aceitar/recusar)
app.put('/consulta/:id/atualizar', async (req, res) => {
  const { id } = req.params;
  const { Status, Motivo_Recusa } = req.body;
  try {
    await connection.execute(
      'UPDATE consulta SET Status = ?, Motivo_Recusa = ? WHERE ID_Consulta = ?',
      [Status, Motivo_Recusa || null, id]
    );
    res.json({ message: 'Consulta atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar consulta', details: err });
  }
});

// 7. Listar pacientes de um psicólogo
app.get('/psicologo/:id/pacientes', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await connection.execute(
      `SELECT DISTINCT u.ID_Usuario, u.Nome, u.Email
       FROM consulta c
       JOIN usuario u ON u.ID_Usuario = c.ID_Usuario
       WHERE c.ID_Psicologo = ? AND c.Status = 'Concluída'`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pacientes', details: err });
  }
});

// 8. Adicionar anotação de psicólogo para paciente
app.post('/psicologo/:id/anotacao', async (req, res) => {
  const { ID_Usuario, Conteudo } = req.body;
  const { id } = req.params;
  try {
    await connection.execute(
      'INSERT INTO anotacao_paciente (ID_Psicologo, ID_Usuario, Conteudo) VALUES (?, ?, ?)',
      [id, ID_Usuario, Conteudo]
    );
    res.status(201).json({ message: 'Anotação registrada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar anotação', details: err });
  }
});

// 9. Criar registro de progresso
app.post('/registro_progresso', async (req, res) => {
  const { ID_Usuario, Data, Emocao, Descricao } = req.body;
  try {
    await connection.execute(
      'INSERT INTO registro_progresso (ID_Usuario, Data, Emocao, Descricao) VALUES (?, ?, ?, ?)',
      [ID_Usuario, Data, Emocao, Descricao]
    );
    res.status(201).json({ message: 'Registro criado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar registro', details: err });
  }
});

app.get('/', (req, res) => {
  res.send('API HealSync rodando...');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
