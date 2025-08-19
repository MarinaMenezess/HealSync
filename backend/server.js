const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    req.is_psicologo = payload.is_psicologo; // Adicionado is_psicologo ao request
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
    // Incluindo o tipo de usuário no token
    const token = jwt.sign({ id: user.id_usuario, is_psicologo: user.is_psicologo }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  });
});

// ---------- CONVERSA IA ----------

// Rota para buscar todas as conversas de um usuário
app.get('/ia/conversas', authMiddleware, (req, res) => {
    connection.query(
        'SELECT id_conversa, titulo_opcional, data_inicio FROM ia_conversa WHERE id_usuario = ? ORDER BY data_inicio DESC',
        [req.userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Rota para buscar as mensagens de uma conversa específica
app.get('/ia/conversas/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    connection.query(
        'SELECT remetente, conteudo, data_hora FROM ia_mensagem WHERE id_conversa = ? ORDER BY data_hora ASC',
        [id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

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

// ---------- CHAT COM IA ----------

app.post('/ia/chat', authMiddleware, async (req, res) => {
    const { id_conversa, mensagem_usuario } = req.body;

    if (!id_conversa || !mensagem_usuario) {
        return res.status(400).json({ error: 'ID da conversa e mensagem são obrigatórios.' });
    }

    try {
        // 1. Salvar a mensagem do usuário no banco de dados
        await new Promise((resolve, reject) => {
            connection.query(
                'INSERT INTO ia_mensagem (id_conversa, remetente, conteudo, data_hora) VALUES (?, ?, ?, NOW())',
                [id_conversa, 'usuario', mensagem_usuario],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });

        // 2. Recuperar o histórico completo da conversa do banco de dados
        const [historico] = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT remetente, conteudo FROM ia_mensagem WHERE id_conversa = ? ORDER BY data_hora ASC',
                [id_conversa],
                (err, results) => {
                    if (err) return reject(err);
                    resolve([results]);
                }
            );
        });

        // 3. Formatar o histórico para a API do Gemini
        const formattedHistory = historico.map(msg => ({
            role: msg.remetente === 'usuario' ? 'user' : 'model',
            parts: [{ text: msg.conteudo }]
        }));

        // Adiciona a mensagem do usuário para enviar à API
        formattedHistory.push({
            role: 'user',
            parts: [{ text: mensagem_usuario }]
        });
        
        // 4. Inicia uma nova conversa com o histórico recuperado
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 100,
            },
        });
        
        // 5. Enviar a mensagem do usuário para o modelo Gemini
        const result = await chat.sendMessage(mensagem_usuario);
        const respostaIA = result.response.text();

        // 6. Salvar a resposta da IA no banco de dados
        await new Promise((resolve, reject) => {
            connection.query(
                'INSERT INTO ia_mensagem (id_conversa, remetente, conteudo, data_hora) VALUES (?, ?, ?, NOW())',
                [id_conversa, 'ia', respostaIA],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
        
        res.json({ resposta: respostaIA, mensagem: 'Mensagem e resposta salvas com sucesso.' });

    } catch (error) {
        console.error('Erro na requisição da IA:', error);
        res.status(500).json({ error: 'Erro ao processar a mensagem com a IA.' });
    }
});


// ---------- CONSULTAS (Solicitações) ----------

// Rota para paciente enviar uma solicitação de consulta
app.post('/consultas', authMiddleware, (req, res) => {
  // Apenas pacientes podem enviar solicitações
  if (req.is_psicologo) {
    return res.status(403).json({ error: 'Apenas pacientes podem enviar solicitações de consulta.' });
  }
  const { id_psicologo, data_hora } = req.body;
  connection.query(
    'INSERT INTO solicitacao_consulta (id_paciente, id_psicologo, data_solicitada, status) VALUES (?, ?, ?, ?)',
    [req.userId, id_psicologo, data_hora, 'pendente'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ mensagem: 'Solicitação de consulta enviada com sucesso.', id: result.insertId });
    }
  );
});

// Rota para psicólogo visualizar suas solicitações pendentes
app.get('/consultas/pendentes', authMiddleware, (req, res) => {
  // Apenas psicólogos podem ver as solicitações
  if (!req.is_psicologo) {
    return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem visualizar as solicitações.' });
  }
  connection.query(
    `SELECT c.*, u.nome AS nome_paciente, u.email AS email_paciente, u.data_nascimento
     FROM solicitacao_consulta c
     JOIN usuario u ON c.id_paciente = u.id_usuario
     WHERE c.id_psicologo = ? AND c.status = 'pendente'`,
    [req.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Rota para psicólogo responder a uma solicitação (aceitar/recusar)
app.put('/consultas/:id', authMiddleware, (req, res) => {
  // Apenas psicólogos podem responder
  if (!req.is_psicologo) {
    return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem responder às solicitações.' });
  }
  const { status, motivo_recusa } = req.body;
  const { id } = req.params;

  if (!['aceita', 'recusada'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }
  // Validação para obrigar o motivo quando o status for 'recusada'
  if (status === 'recusada' && (!motivo_recusa || motivo_recusa.trim() === '')) {
    return res.status(400).json({ error: 'O motivo da recusa é obrigatório.' });
  }

  let query = 'UPDATE solicitacao_consulta SET status = ?';
  let params = [status];

  if (status === 'recusada') {
    query += ', motivo_recusa = ?';
    params.push(motivo_recusa);
  } else {
    query += ', motivo_recusa = NULL'; // Limpa o motivo se aceitar
  }

  query += ' WHERE id_solicitacao = ? AND id_psicologo = ?';
  params.push(id, req.userId);

  connection.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada ou você não tem permissão.' });
    }
    res.json({ mensagem: `Solicitação ${status} com sucesso.` });
  });
});


// As rotas abaixo foram removidas para evitar conflito com a nova lógica.
// app.post('/consultas', ...)
// app.put('/consultas/:id', ...)
// app.delete('/consultas/:id', ...)

// ---------- REGISTROS ----------
// ... (rotas de registros, comentários, curtidas, anotações e outras rotas originais)
// Seu código original a partir daqui
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