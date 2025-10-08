const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente

// ---------- FIREBASE ADMIN SDK SETUP ----------
const admin = require('firebase-admin');
// ATENÇÃO: Você deve criar este arquivo na pasta 'backend'
const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
// ----------------------------------------------

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const app = express();
app.use(bodyParser.json());

app.use(cors({ origin: 'http://127.0.0.1:5501' }));

const JWT_SECRET = 'chave_secreta';

// Middleware de autenticação (permanece verificando o JWT local)
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

// ---------- AUTENTICAÇÃO COM FIREBASE ----------

// Rota para criar o registro do perfil no MySQL APÓS a autenticação no Firebase
app.post('/register-profile', async (req, res) => {
    // 1. Obter e verificar o token do Firebase enviado pelo frontend
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação Firebase não fornecido' });
    }
    const firebaseIdToken = authHeader.split(' ')[1];
    let firebaseUid;
    let userEmail;

    try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        firebaseUid = decodedToken.uid; 
        userEmail = decodedToken.email; // Usar o email do token Firebase
    } catch (error) {
        console.error('Erro ao verificar o token Firebase:', error);
        return res.status(401).json({ error: 'Token Firebase inválido ou expirado' });
    }

    // 2. Extrair dados do perfil (a senha é gerenciada pelo Firebase e não é salva aqui)
    // Usamos o email obtido do token do Firebase para garantir a consistência
    const { nome, data_nascimento, genero, is_psicologo, especialidade, contato } = req.body;
    
    // 3. Salvar o perfil no MySQL (usando firebaseUid)
    connection.query(
        // ATENÇÃO: Sua tabela 'usuario' deve ser modificada para ter a coluna 'firebase_uid' (UNIQUE) e NÃO TER 'senha'.
        'INSERT INTO usuario (firebase_uid, nome, email, data_nascimento, genero, is_psicologo, especialidade, contato) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [firebaseUid, nome, userEmail, data_nascimento, genero, is_psicologo, especialidade, contato],
        (err, result) => {
            if (err) {
                // Erro comum aqui é DUPLICATE ENTRY se o usuário já estiver cadastrado no MySQL
                if (err.code === 'ER_DUP_ENTRY') {
                     return res.status(409).json({ error: 'Perfil de usuário já cadastrado.' });
                }
                console.error('Erro ao inserir no MySQL:', err.message);
                return res.status(500).json({ error: 'Erro ao salvar perfil no banco de dados: ' + err.message });
            }
            res.status(201).json({ id: result.insertId, firebaseUid, mensagem: 'Perfil registrado com sucesso.' });
        }
    );
});

// =========================================================================
// CORREÇÃO: NOVA ROTA /register PARA CRIAR O USUÁRIO NO MYSQL APÓS O FIREBASE
// =========================================================================

// Rota de Registro Inicial (para ser usada após Google Sign Up ou Email/Senha Sign Up)
// Nota: O frontend deve enviar o token do Firebase no header 'Authorization: Bearer <token>'
app.post('/register', async (req, res) => {
    // 1. Obter e verificar o token do Firebase enviado pelo frontend
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação Firebase não fornecido' });
    }
    const firebaseIdToken = authHeader.split(' ')[1];
    let decodedToken;
    // O nome e email no corpo da requisição são usados como fallback
    let userName = req.body.name || 'Novo Usuário'; 
    let userEmail = req.body.email; 

    try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        
        // Usa os dados verificados do Firebase, que são mais confiáveis
        const firebaseUid = decodedToken.uid;
        userEmail = decodedToken.email || userEmail;
        userName = decodedToken.name || userName; 

        // 2. Tenta encontrar o usuário pelo firebase_uid
        connection.query('SELECT id_usuario FROM usuario WHERE firebase_uid = ?', [firebaseUid], (err, results) => {
            if (err) {
                console.error('Erro ao consultar o banco de dados:', err.message);
                return res.status(500).json({ error: 'Erro no servidor ao buscar usuário.' });
            }
            
            if (results.length > 0) {
                // Se já existe, significa que o registro no MySQL já foi feito.
                return res.status(409).json({ error: 'Usuário já registrado. Prossiga para o login.' });
            }
            
            // 3. Inserir o novo usuário no MySQL (is_psicologo = 0 por padrão para novo usuário)
            const insertQuery = `
                INSERT INTO usuario (firebase_uid, nome, email, is_psicologo) 
                VALUES (?, ?, ?, 0)
            `;
            
            connection.query(insertQuery, [firebaseUid, userName, userEmail], (insertErr, insertResult) => {
                if (insertErr) {
                    // Erro comum aqui é ER_DUP_ENTRY no campo 'email' se for unique
                    if (insertErr.code === 'ER_DUP_ENTRY') {
                         return res.status(409).json({ error: 'E-mail já cadastrado. Tente fazer login.' });
                    }
                    console.error('Erro ao inserir no MySQL:', insertErr.message);
                    return res.status(500).json({ error: 'Erro ao registrar perfil no banco de dados.' });
                }
                
                console.log(`Novo usuário (UID: ${firebaseUid}) registrado no MySQL.`);
                res.status(201).json({ 
                    id: insertResult.insertId, 
                    firebaseUid, 
                    mensagem: 'Usuário registrado com sucesso.' 
                });
            });
        });

    } catch (error) {
        console.error('Erro ao verificar o token Firebase:', error);
        // O Firebase falhou, o token está inválido ou expirado
        return res.status(401).json({ error: 'Token Firebase inválido ou expirado' });
    }
});

// =========================================================================
// Rota de login agora verifica o token do Firebase e retorna o JWT local
app.post('/login', async (req, res) => {
    // 1. Obter e verificar o token do Firebase enviado pelo frontend
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação Firebase não fornecido' });
    }
    const firebaseIdToken = authHeader.split(' ')[1];
    let firebaseUid;
    let userEmail;

    try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        firebaseUid = decodedToken.uid;
        userEmail = decodedToken.email;
    } catch (error) {
        console.error('Erro ao verificar o token Firebase:', error);
        return res.status(401).json({ error: 'Token Firebase inválido ou expirado' });
    }

    // 2. Buscar o usuário no MySQL usando o firebase_uid
    connection.query('SELECT * FROM usuario WHERE firebase_uid = ?', [firebaseUid], (err, results) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err.message);
            return res.status(500).json({ error: 'Erro no servidor ao buscar usuário.' });
        }
        
        if (results.length === 0) {
            // O usuário está autenticado no Firebase, mas não tem perfil no MySQL. 
            return res.status(404).json({ error: 'Perfil de usuário não encontrado no banco de dados. Conclua o cadastro.' });
        }
        
        const user = results[0];
        
        // 3. Gerar e retornar o JWT local para uso nas rotas protegidas
        const token = jwt.sign({ id: user.id_usuario, is_psicologo: user.is_psicologo }, JWT_SECRET, { expiresIn: '1d' });
        
        // Remover firebase_uid e qualquer campo sensível antes de enviar ao frontend
        const { firebase_uid, ...userWithoutPrivateFields } = user;
        
        res.json({ token, user: userWithoutPrivateFields });
    });
});

// ---------- SOLICITAÇÃO DE PERFIL PSICÓLOGO ----------

// Rota para o usuário solicitar/atualizar detalhes do perfil de psicólogo
// O envio desses dados sinaliza a solicitação. O campo 'is_psicologo' deve ser
// ativado por um administrador separadamente para fins de segurança e verificação.
app.put('/users/psychologist-details', authMiddleware, (req, res) => {
    const { especialidade, contato } = req.body;
    const userId = req.userId;

    if (!especialidade || !contato) {
        return res.status(400).json({ error: 'Especialidade e contato são obrigatórios para a solicitação de perfil de psicólogo.' });
    }

    // A rota é usada tanto para a solicitação inicial quanto para a atualização de detalhes,
    // se o usuário já for um psicólogo.
    connection.query(
        'UPDATE usuario SET especialidade = ?, contato = ? WHERE id_usuario = ?',
        [especialidade, contato, userId],
        (err, result) => {
            if (err) {
                console.error('Erro ao atualizar detalhes/solicitação de psicólogo:', err.message);
                return res.status(500).json({ error: 'Erro ao processar sua solicitação.' });
            }

            if (req.is_psicologo) {
                return res.json({ mensagem: 'Detalhes do perfil de psicólogo atualizados com sucesso.' });
            } else {
                return res.json({ mensagem: 'Solicitação de perfil de psicólogo enviada para análise (Detalhes atualizados). Um administrador revisará sua conta.' });
            }
        }
    );
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