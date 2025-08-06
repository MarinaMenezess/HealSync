const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

app.use(cors({ origin: 'http://127.0.0.1:5500' }));

const JWT_SECRET = 'chave_secreta';

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ---------- AUTENTICAÇÃO ----------

app.post('/register', async (req, res) => {
  const { nome, email, senha, data_nascimento, genero, is_psicologo, especialidade, contato } = req.body;
  const hashedPassword = await bcrypt.hash(senha, 10);
  connection.query(
    'INSERT INTO usuario (nome, email, senha, data_nascimento, genero, is_psicologo, especialidade, contato) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nome, email, hashedPassword, data_nascimento, genero, is_psicologo, especialidade, contato],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  connection.query('SELECT * FROM usuario WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
    const user = results[0];
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(401).json({ error: 'Senha incorreta' });
    const token = jwt.sign({ id: user.id_usuario }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  });
});

// ---------- CONVERSA IA ----------

app.post('/ia/conversas', authMiddleware, (req, res) => {
  const { titulo_opcional } = req.body;
  connection.query(
    'INSERT INTO ia_conversa (id_usuario, data_inicio, titulo_opcional) VALUES (?, NOW(), ?)',
    [req.userId, titulo_opcional],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.post('/ia/mensagens', authMiddleware, (req, res) => {
  const { id_conversa, remetente, conteudo } = req.body;
  connection.query(
    'INSERT INTO ia_mensagem (id_conversa, remetente, conteudo, data_hora) VALUES (?, ?, ?, NOW())',
    [id_conversa, remetente, conteudo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

// ---------- CONSULTAS ----------

app.post('/consultas', authMiddleware, (req, res) => {
  const { id_usuario, id_psicologo, data_hora, status, motivo_recusa } = req.body;
  connection.query(
    'INSERT INTO consulta (id_usuario, id_psicologo, data_hora, status, motivo_recusa) VALUES (?, ?, ?, ?, ?)',
    [id_usuario, id_psicologo, data_hora, status, motivo_recusa],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.put('/consultas/:id', authMiddleware, (req, res) => {
  const { data_hora, status, motivo_recusa } = req.body;
  connection.query(
    'UPDATE consulta SET data_hora = ?, status = ?, motivo_recusa = ? WHERE id_consulta = ?',
    [data_hora, status, motivo_recusa, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Consulta atualizada com sucesso' });
    }
  );
});

app.delete('/consultas/:id', authMiddleware, (req, res) => {
  connection.query(
    'DELETE FROM consulta WHERE id_consulta = ?',
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Consulta excluída com sucesso' });
    }
  );
});

// ---------- REGISTROS ----------

app.post('/registros', authMiddleware, (req, res) => {
  const { data, emocao, descricao } = req.body;
  connection.query(
    'INSERT INTO registro_progresso (id_usuario, data, emocao, descricao) VALUES (?, ?, ?, ?)',
    [req.userId, data, emocao, descricao],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.put('/registros/:id', authMiddleware, (req, res) => {
  const { emocao, descricao } = req.body;
  connection.query(
    'UPDATE registro_progresso SET emocao = ?, descricao = ? WHERE id_registro = ? AND id_usuario = ?',
    [emocao, descricao, req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Registro atualizado com sucesso' });
    }
  );
});

app.delete('/registros/:id', authMiddleware, (req, res) => {
  connection.query(
    'DELETE FROM registro_progresso WHERE id_registro = ? AND id_usuario = ?',
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Registro excluído com sucesso' });
    }
  );
});

// ---------- COMENTÁRIOS ----------

app.post('/comentarios', authMiddleware, (req, res) => {
  const { id_registro, conteudo } = req.body;
  connection.query(
    'INSERT INTO comentario (id_registro, id_usuario, conteudo) VALUES (?, ?, ?)',
    [id_registro, req.userId, conteudo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.put('/comentarios/:id', authMiddleware, (req, res) => {
  const { conteudo } = req.body;
  connection.query(
    'UPDATE comentario SET conteudo = ? WHERE id_comentario = ? AND id_usuario = ?',
    [conteudo, req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Comentário atualizado com sucesso' });
    }
  );
});

app.delete('/comentarios/:id', authMiddleware, (req, res) => {
  connection.query(
    'DELETE FROM comentario WHERE id_comentario = ? AND id_usuario = ?',
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Comentário excluído com sucesso' });
    }
  );
});

// ---------- CURTIDAS ----------

app.post('/curtidas', authMiddleware, (req, res) => {
  const { id_registro } = req.body;
  connection.query(
    'INSERT INTO curtida (id_registro, id_usuario) VALUES (?, ?)',
    [id_registro, req.userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.delete('/curtidas/:id', authMiddleware, (req, res) => {
  connection.query(
    'DELETE FROM curtida WHERE id_curtida = ? AND id_usuario = ?',
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Curtida removida com sucesso' });
    }
  );
});

// ---------- ANOTAÇÕES ----------

app.post('/anotacoes', authMiddleware, (req, res) => {
  const { id_usuario, conteudo } = req.body;
  connection.query(
    'INSERT INTO anotacao_paciente (id_psicologo, id_usuario, data_anotacao, conteudo) VALUES (?, ?, CURDATE(), ?)',
    [req.userId, id_usuario, conteudo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

app.put('/anotacoes/:id', authMiddleware, (req, res) => {
  const { conteudo } = req.body;
  connection.query(
    'UPDATE anotacao_paciente SET conteudo = ? WHERE id_anotacao = ? AND id_psicologo = ?',
    [conteudo, req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Anotação atualizada com sucesso' });
    }
  );
});

app.delete('/anotacoes/:id', authMiddleware, (req, res) => {
  connection.query(
    'DELETE FROM anotacao_paciente WHERE id_anotacao = ? AND id_psicologo = ?',
    [req.params.id, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensagem: 'Anotação excluída com sucesso' });
    }
  );
});

// ---------- START SERVER ----------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
