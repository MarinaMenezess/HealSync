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
    const payload = jwt.verify(token, 'segredo_super_secreto'); // troque pela sua chave secreta
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
  const { nome, email, senha, data_nascim, genero } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

  const hashedPwd = await bcrypt.hash(senha, 10);
  try {
    const [rows] = await connection.execute(
      'INSERT INTO usuario (Nome, Email, Senha, Data_Nascim, Genero) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hashedPwd, data_nascim, genero]
    );
    res.status(201).json({ message: 'Usuário criado', id: rows.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário', detalhes: err.message });
  }
});

// Login usuário
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  try {
    const [rows] = await connection.execute('SELECT * FROM usuario WHERE Email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

    const user = rows[0];
    const valid = await bcrypt.compare(senha, user.Senha);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.ID_Usuario }, 'segredo_super_secreto', { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login', detalhes: err.message });
  }
});

// Obter perfil do usuário (com autenticação)
app.get('/usuarios/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (parseInt(id) !== req.userId) return res.status(403).json({ error: 'Acesso negado' });

  try {
    const [rows] = await connection.execute('SELECT ID_Usuario, Nome, Email, Data_Nascim, Genero, Data_Cadastro, Configuracoes_Privacidade FROM usuario WHERE ID_Usuario = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário', detalhes: err.message });
  }
});

// Atualizar perfil do usuário
app.put('/usuarios/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (parseInt(id) !== req.userId) return res.status(403).json({ error: 'Acesso negado' });

  const { nome, email, senha, data_nascim, genero, configuracoes_privacidade } = req.body;
  try {
    let query = 'UPDATE usuario SET ';
    const params = [];
    if (nome) { query += 'Nome = ?, '; params.push(nome); }
    if (email) { query += 'Email = ?, '; params.push(email); }
    if (senha) {
      const hashed = await bcrypt.hash(senha, 10);
      query += 'Senha = ?, '; params.push(hashed);
    }
    if (data_nascim) { query += 'Data_Nascim = ?, '; params.push(data_nascim); }
    if (genero) { query += 'Genero = ?, '; params.push(genero); }
    if (configuracoes_privacidade) { query += 'Configuracoes_Privacidade = ?, '; params.push(configuracoes_privacidade); }

    if (params.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    query = query.slice(0, -2) + ' WHERE ID_Usuario = ?';
    params.push(id);

    await connection.execute(query, params);
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário', detalhes: err.message });
  }
});

// Excluir usuário
app.delete('/usuarios/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  if (parseInt(id) !== req.userId) return res.status(403).json({ error: 'Acesso negado' });

  try {
    await connection.execute('DELETE FROM usuario WHERE ID_Usuario = ?', [id]);
    res.json({ message: 'Usuário excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário', detalhes: err.message });
  }
});

///////////////////////
// ROTAS PSICÓLOGO
///////////////////////

app.get('/psicologos', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM psicologo');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/psicologos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM psicologo WHERE ID_Psicologo = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Psicólogo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/psicologos', async (req, res) => {
  const { nome, especialidade, contato, avaliacao } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO psicologo (Nome, Especialidade, Contato, Avaliacao) VALUES (?, ?, ?, ?)',
      [nome, especialidade, contato, avaliacao]
    );
    res.status(201).json({ message: 'Psicólogo criado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/psicologos/:id', async (req, res) => {
  const id = req.params.id;
  const { nome, especialidade, contato, avaliacao } = req.body;

  try {
    let query = 'UPDATE psicologo SET ';
    const params = [];
    if (nome) { query += 'Nome = ?, '; params.push(nome); }
    if (especialidade) { query += 'Especialidade = ?, '; params.push(especialidade); }
    if (contato) { query += 'Contato = ?, '; params.push(contato); }
    if (avaliacao !== undefined) { query += 'Avaliacao = ?, '; params.push(avaliacao); }
    if (params.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    query = query.slice(0, -2) + ' WHERE ID_Psicologo = ?';
    params.push(id);

    await connection.execute(query, params);
    res.json({ message: 'Psicólogo atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/psicologos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await connection.execute('DELETE FROM psicologo WHERE ID_Psicologo = ?', [id]);
    res.json({ message: 'Psicólogo excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

///////////////////////
// ROTAS CONSULTAS
///////////////////////

app.get('/consultas', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM consulta');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/consultas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM consulta WHERE ID_Consulta = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Consulta não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/consultas', async (req, res) => {
  const { id_usuario, id_psicologo, data_hora, status } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO consulta (ID_Usuario, ID_Psicologo, Data_Hora, Status) VALUES (?, ?, ?, ?)',
      [id_usuario, id_psicologo, data_hora, status]
    );
    res.status(201).json({ message: 'Consulta agendada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/consultas/:id', async (req, res) => {
  const id = req.params.id;
  const { data_hora, status } = req.body;

  try {
    let query = 'UPDATE consulta SET ';
    const params = [];
    if (data_hora) { query += 'Data_Hora = ?, '; params.push(data_hora); }
    if (status) { query += 'Status = ?, '; params.push(status); }
    if (params.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    query = query.slice(0, -2) + ' WHERE ID_Consulta = ?';
    params.push(id);

    await connection.execute(query, params);
    res.json({ message: 'Consulta atualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/consultas/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await connection.execute('DELETE FROM consulta WHERE ID_Consulta = ?', [id]);
    res.json({ message: 'Consulta excluída' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultas de um usuário
app.get('/usuarios/:id/consultas', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM consulta WHERE ID_Usuario = ?', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

///////////////////////
// ROTAS REGISTRO DE PROGRESSO
///////////////////////

app.get('/usuarios/:id/registros', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM registro_progresso WHERE ID_Usuario = ?', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/usuarios/:id/registros', async (req, res) => {
  const id = req.params.id;
  const { data, emocao, descricao } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO registro_progresso (ID_Usuario, Data, Emocao, Descricao) VALUES (?, ?, ?, ?)',
      [id, data, emocao, descricao]
    );
    res.status(201).json({ message: 'Registro criado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/registros/:id', async (req, res) => {
  const id = req.params.id;
  const { data, emocao, descricao } = req.body;

  try {
    let query = 'UPDATE registro_progresso SET ';
    const params = [];
    if (data) { query += 'Data = ?, '; params.push(data); }
    if (emocao) { query += 'Emocao = ?, '; params.push(emocao); }
    if (descricao) { query += 'Descricao = ?, '; params.push(descricao); }
    if (params.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    query = query.slice(0, -2) + ' WHERE ID_Registro = ?';
    params.push(id);

    await connection.execute(query, params);
    res.json({ message: 'Registro atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/registros/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await connection.execute('DELETE FROM registro_progresso WHERE ID_Registro = ?', [id]);
    res.json({ message: 'Registro excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

///////////////////////
// ROTAS MENSAGENS
///////////////////////

app.get('/usuarios/:id/mensagens', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM mensagem WHERE ID_Usuario = ? OR ID_Psicologo = ? ORDER BY Data_Hora DESC',
      [id, id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/mensagens', async (req, res) => {
  const { id_usuario, id_psicologo, conteudo, data_hora } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO mensagem (ID_Usuario, ID_Psicologo, Conteudo, Data_Hora) VALUES (?, ?, ?, ?)',
      [id_usuario, id_psicologo, conteudo, data_hora]
    );
    res.status(201).json({ message: 'Mensagem enviada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

///////////////////////
// ROTAS INTERAÇÕES
///////////////////////

app.get('/usuarios/:id/interacoes', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM interacao WHERE ID_Usuario = ?', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/interacoes', async (req, res) => {
  const { id_usuario, tipo_interacao, data_hora } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO interacao (ID_Usuario, Tipo_Interacao, Data_Hora) VALUES (?, ?, ?)',
      [id_usuario, tipo_interacao, data_hora]
    );
    res.status(201).json({ message: 'Interação registrada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
