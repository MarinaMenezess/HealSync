// ARQUIVO: backend/server.js (COMPLETO E ATUALIZADO)
const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente

// NOVO: Importa o módulo de automação/scraping (instável)
const { scrapeCfpValidation } = require('./cfp_scraper');

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
    // CFP e CPF Adicionados
    const { nome, data_nascimento, genero, is_psicologo, especialidade, contato, cfp, cpf } = req.body; 
    
    // **VALIDAÇÃO DE CFP/CPF (Automação Solicitada)**
    if (is_psicologo) {
        if (!cfp || !cpf) {
             return res.status(400).json({ error: 'CFP e CPF são obrigatórios para registro como psicólogo.' });
        }
        
        // Chama a função de automação instável
        const validationResult = await scrapeCfpValidation(cfp, cpf);
        
        if (!validationResult.valid) {
            // Se a automação falhar, o processo de registro inicial é bloqueado.
            return res.status(400).json({ error: 'A validação automática de profissional falhou: ' + validationResult.message });
        }
        // Nota: is_psicologo = 0 (false) para registro inicial, ativado apenas após ADMIN revisar.
    }
    // FIM DA VALIDAÇÃO DE CFP/CPF
    
    // 3. Salvar o perfil no MySQL (usando firebaseUid)
    connection.query(
        // CFP e CPF Adicionados
        'INSERT INTO usuario (firebase_uid, nome, email, data_nascimento, genero, is_psicologo, especialidade, contato, cfp, cpf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firebaseUid, nome, userEmail, data_nascimento, genero, 0, especialidade, contato, cfp, cpf], // is_psicologo = 0 (false)
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

// ROTA /register (Registro Inicial)
app.post('/register', async (req, res) => {
    // 1. Obter e verificar o token do Firebase enviado pelo frontend
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação Firebase não fornecido' });
    }
    const firebaseIdToken = authHeader.split(' ')[1];
    let decodedToken;
    
    let userName = req.body.nome || req.body.name || 'Novo Usuário'; 
    let userEmail = req.body.email; 

    try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        
        const firebaseUid = decodedToken.uid;
        userEmail = decodedToken.email || userEmail;
        userName = decodedToken.name || userName; 

        // 2. Tenta encontrar o usuário pelo firebase_uid
        connection.query('SELECT * FROM usuario WHERE firebase_uid = ?', [firebaseUid], (err, results) => {
            if (err) {
                console.error('Erro ao consultar o banco de dados:', err.message);
                return res.status(500).json({ error: 'Erro no servidor ao buscar usuário.' });
            }
            
            if (results.length > 0) {
                return res.status(409).json({ error: 'Usuário já registrado. Prossiga para o login.' });
            }
            
            // 3. Inserir o novo usuário no MySQL (is_psicologo = 0 por padrão).
            const insertQuery = `
                INSERT INTO usuario (firebase_uid, nome, email, is_psicologo, cfp, cpf) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const queryParams = [
                firebaseUid, 
                userName, 
                userEmail, 
                0,    // Valor para is_psicologo (0 = false)
                null, // Valor para cfp (null)
                null  // Valor para cpf (null)
            ];

            connection.query(insertQuery, queryParams, (insertErr, insertResult) => {
                if (insertErr) {
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
        return res.status(401).json({ error: 'Token Firebase inválido ou expirado' });
    }
});

// ROTA PARA OBTER PSICÓLOGOS APROVADOS (Listagem da página)
app.get('/psychologists', (req, res) => {
    const searchTerm = req.query.search;
    let query = 'SELECT id_usuario, nome, email, especialidade, contato, avaliacao FROM usuario WHERE is_psicologo = 1';
    const params = [];

    if (searchTerm) {
        // Adiciona a condição para buscar por nome OU especialidade (case insensitive)
        query += ' AND (nome LIKE ? OR especialidade LIKE ?)';
        const likeTerm = `%${searchTerm}%`;
        params.push(likeTerm, likeTerm);
    }
    
    query += ' ORDER BY avaliacao DESC';

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro ao buscar lista de psicólogos:', err.message);
            return res.status(500).json({ error: 'Erro no servidor ao buscar psicólogos.' });
        }
        res.json(results);
    });
});

// =========================================================================
// ROTA PARA OBTER POSTS PÚBLICOS PARA A TIMELINE (GET /posts) - ADICIONADA
// =========================================================================
app.get('/posts', (req, res) => {
    // Retorna todos os posts marcados como públicos, juntamente com o nome do usuário.
    const query = `
        SELECT rp.id_registro, rp.data, rp.emocao, rp.descricao, u.nome AS nome_usuario
        FROM registro_progresso rp
        JOIN usuario u ON rp.id_usuario = u.id_usuario
        WHERE rp.is_public = 1
        ORDER BY rp.data DESC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar posts públicos:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar posts.' });
        }
        res.json(results);
    });
});

// =========================================================================
// NOVO: ROTA PARA OBTER DETALHES DE PERFIL POR ID (para psy-profile.html)
// =========================================================================
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    
    const query = 'SELECT nome, email, especialidade, contato, avaliacao, is_psicologo, cfp FROM usuario WHERE id_usuario = ?';

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar perfil de usuário:', err.message);
            return res.status(500).json({ error: 'Erro no servidor ao buscar perfil.' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Perfil não encontrado.' });
        }
        
        const user = results[0];
        
        // Regra de segurança: Se a página é para perfil de psicólogo, confirmamos se é um.
        if (user.is_psicologo !== 1) {
             return res.status(404).json({ error: 'Perfil não encontrado ou não é um psicólogo aprovado.' });
        }

        // Removendo campos sensíveis/privados que não devem ser exibidos
        delete user.is_psicologo;
        delete user.cfp; // O CFP não deve ser público
        delete user.email; // O email não deve ser público

        // Adicionando uma biografia fictícia (assumindo que o campo 'bio' não existe no schema)
        user.bio = 'Profissional com vasta experiência na área de saúde mental. Dedicado a fornecer suporte e orientação para o desenvolvimento pessoal e emocional.'; 

        res.json(user);
    });
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
app.put('/users/psychologist-details', authMiddleware, async (req, res) => { 
    const { especialidade, contato, cfp, cpf } = req.body; // CFP e CPF Adicionados
    const userId = req.userId;

    if (!especialidade || !contato || !cfp || !cpf) { // CPF Adicionado
        return res.status(400).json({ error: 'Especialidade, contato, CFP e CPF são obrigatórios para a solicitação de perfil de psicólogo.' });
    }
    
    // **VALIDAÇÃO DE CFP/CPF (Automação Solicitada)**
    const validationResult = await scrapeCfpValidation(cfp, cpf);
    
    // Se a validação automática falhar, o processo de atualização de dados (CPF/CFP) é impedido, 
    // mas a mensagem de erro é o resultado da automação instável.
    if (!validationResult.valid) {
        return res.status(400).json({ error: validationResult.message });
    }
    // FIM DA VALIDAÇÃO DE CFP/CPF

    // A rota é usada tanto para a solicitação inicial quanto para a atualização de detalhes,
    // se o usuário já for um psicólogo.
    connection.query(
        // CFP e CPF Adicionados
        'UPDATE usuario SET especialidade = ?, contato = ?, cfp = ?, cpf = ? WHERE id_usuario = ?',
        [especialidade, contato, cfp, cpf, userId],
        (err, result) => {
            if (err) {
                console.error('Erro ao atualizar detalhes/solicitação de psicólogo:', err.message);
                return res.status(500).json({ error: 'Erro ao processar sua solicitação.' });
            }

            if (req.is_psicologo) {
                return res.json({ mensagem: 'Detalhes do perfil de psicólogo atualizados com sucesso.' });
            } else {
                // A mensagem reflete o resultado da automação, que agora permite a revisão manual.
                return res.json({ mensagem: validationResult.message });
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
    // Inicia com um título padrão 'Nova Conversa' (ou o que for enviado), que será atualizado na primeira mensagem.
    'INSERT INTO ia_conversa (id_usuario, data_inicio, titulo_opcional) VALUES (?, NOW(), ?)',
    [req.userId, titulo_opcional],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

// ---------- CHAT COM IA (ATUALIZADO) ----------

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
        // Note: 'historico' agora inclui a mensagem que acabamos de salvar
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
        
        // 3. (NOVO) Lógica para gerar e atualizar o título da conversa na primeira mensagem
        let novoTitulo = null;
        // Se o histórico tem apenas 1 mensagem, é a primeira mensagem do usuário nesta conversa
        const isFirstMessage = historico.length === 1; 

        if (isFirstMessage) {
            const titlePrompt = `Gere um título conciso (máximo 7 palavras) para uma conversa de chat com base na primeira mensagem do usuário: "${mensagem_usuario}". Retorne apenas o título, sem introduções, aspas ou formatação Markdown.`;
            
            // Chamada da IA para gerar o título
            const titleResult = await model.generateContent(titlePrompt);
            const tituloGerado = titleResult.response.text().trim().replace(/['"“”]/g, ''); // Remove aspas

            // Atualiza o banco de dados
            if (tituloGerado) {
                await new Promise((resolve, reject) => {
                    connection.query(
                        'UPDATE ia_conversa SET titulo_opcional = ? WHERE id_conversa = ?',
                        [tituloGerado, id_conversa],
                        (err) => {
                            if (err) return reject(err);
                            novoTitulo = tituloGerado; // Armazena para retornar ao frontend
                            resolve();
                        }
                    );
                });
            }
        }

        // 4. Formatar o histórico para a API do Gemini
        // O histórico para a API deve ser tudo ANTES da mensagem atual do usuário
        const historyForGemini = historico.slice(0, -1); 
        
        const formattedHistory = historyForGemini.map(msg => ({
            role: msg.remetente === 'usuario' ? 'user' : 'model',
            parts: [{ text: msg.conteudo }]
        }));

        // Conteúdo da instrução de sistema expandido para incluir informações sobre a plataforma HealSync
        const systemInstruction = `
            Você é o HealSync AI, um assistente de saúde mental de apoio para a plataforma HealSync.
            Sua função é responder a perguntas gerais sobre bem-estar e também fornecer informações específicas sobre como usar a plataforma.
            Seja empático, não faça diagnósticos e encoraje o usuário a buscar ajuda profissional quando necessário.
            
            Informações sobre a plataforma HealSync:
            - Objetivo: Conecta pacientes a psicólogos verificados e oferece ferramentas de auto-monitoramento.
            - Diário/Registros: Permite registrar emoções, pensamentos e progresso diário. Os registros podem ser marcados como 'públicos' ou 'privados'.
            - Timeline: Exibe apenas os 'Registros de Progresso' que foram marcados como públicos pelos usuários.
            - Psicólogos: Possui um recurso para buscar e agendar consultas com psicólogos, cujos perfis são verificados (CFP/CPF).
            - Consultas: Pacientes podem solicitar agendamentos de sessões. Psicólogos usam a área de consultas para gerenciar solicitações.
            - Área do Psicólogo (Prontuário/Ficha): Permite ao psicólogo visualizar prontuários de pacientes, histórico de consultas e adicionar anotações de sessão (ficha).
        `;

        // Adiciona a mensagem do usuário para enviar à API
        formattedHistory.push({
            role: 'user',
            parts: [{ text: mensagem_usuario }]
        });
        
        // 5. Inicia o chat com o histórico (sem a mensagem atual) e configurações
        const chat = model.startChat({
            history: formattedHistory,
            config: {
                 // Usa a instrução do sistema expandida
                 systemInstruction: systemInstruction, 
                 generationConfig: {
                    maxOutputTokens: 100,
                 }
            },
        });
        
        // 6. Enviar SÓ a mensagem atual do usuário para o modelo Gemini
        const result = await chat.sendMessage(mensagem_usuario);
        const respostaIA = result.response.text();

        // 7. Salvar a resposta da IA no banco de dados
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
        
        // 8. Retorna a resposta da IA e o novo título (se gerado)
        res.json({ resposta: respostaIA, novo_titulo: novoTitulo, mensagem: 'Mensagem e resposta salvas com sucesso.' });

    } catch (error) {
        console.error('Erro na requisição da IA:', error);
        res.status(500).json({ error: 'Erro ao processar a mensagem com a IA.' });
    }
});


// =========================================================================
// ROTA PARA AGENDAMENTO DE CONSULTA PELO CALENDÁRIO (AGENDA.JS)
// =========================================================================
app.post('/api/agenda/agendar', authMiddleware, (req, res) => { 
    // 1. Apenas pacientes podem enviar solicitações
    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Apenas pacientes podem enviar solicitações de agendamento.' });
    }

    // 2. Extrai dados do payload (do frontend atualizado)
    const { titulo, data, hora, id_psicologo } = req.body;
    const id_paciente = req.userId; // ID do paciente via JWT
    
    // 3. Validação básica de campos
    if (!titulo || !data || !hora || !id_psicologo) {
        return res.status(400).json({ error: 'Dados de agendamento incompletos (título, data, hora, ou ID do psicólogo ausentes).' });
    }
    
    // 4. Combina data e hora para o formato DATETIME do MySQL (YYYY-MM-DD HH:MM:SS)
    const dataHoraConsulta = `${data} ${hora}:00`; 
    
    // 5. Query de inserção
    connection.query(
        'INSERT INTO solicitacao_consulta (id_paciente, id_psicologo, data_solicitada, status, motivo) VALUES (?, ?, ?, ?, ?)',
        [id_paciente, id_psicologo, dataHoraConsulta, 'pendente', titulo],
        (err, result) => {
            if (err) {
                console.error('Erro ao registrar a solicitação de agendamento:', err.message);
                return res.status(500).json({ error: 'Erro ao salvar solicitação no banco de dados. Verifique a estrutura da tabela solicitacao_consulta.' });
            }
            res.status(201).json({ 
                mensagem: 'Solicitação de agendamento enviada com sucesso.', 
                insertId: result.insertId 
            });
        }
    );
});

// =========================================================================
// ROTA PARA CARREGAR EVENTOS NO CALENDÁRIO (CORRIGIDA E ATUALIZADA)
// =========================================================================
app.get('/api/agenda/eventos', authMiddleware, (req, res) => {
    const userId = req.userId;
    const is_psicologo = req.is_psicologo;

    let query;
    let params;

    if (is_psicologo) {
        // Psicólogo: Apenas consultas aceitas
        query = `SELECT s.id_solicitacao, s.data_solicitada, s.motivo AS titulo_motivo, s.status, u.nome AS nome_paciente 
            FROM solicitacao_consulta s
            JOIN usuario u ON s.id_paciente = u.id_usuario
            WHERE s.id_psicologo = ? AND s.status = 'aceita'`;
        params = [userId];
    } else {
        // Paciente: Todas as solicitações que ele enviou
        query = `SELECT s.id_solicitacao, s.data_solicitada, s.motivo AS titulo_motivo, s.status, u.nome AS nome_psicologo
            FROM solicitacao_consulta s
            JOIN usuario u ON s.id_psicologo = u.id_usuario
            WHERE s.id_paciente = ?`;
        params = [userId];
    }
    
    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro fatal de SQL ao buscar eventos do calendário:', err.message); 
            return res.status(500).json({ error: 'Erro no servidor ao buscar eventos.' });
        }

        // Formata os resultados para o formato FullCalendar
        const events = results.map(row => {
            const titlePrefix = is_psicologo ? `(C) ${row.nome_paciente}: ` : `(P) ${row.nome_psicologo}: `;
            
            return {
                id: row.id_solicitacao,
                title: titlePrefix + row.titulo_motivo, 
                start: row.data_solicitada, 
                extendedProps: {
                    status: row.status,
                    contactName: is_psicologo ? row.nome_paciente : row.nome_psicologo 
                },
                color: (row.status === 'aceita' || row.status === 'confirmada') ? '#28a745' : 
                       (row.status === 'pendente') ? '#ffc107' : 
                       '#dc3545' 
            };
        });

        res.json(events);
    });
});
// =========================================================================

// ---------- CONSULTAS (Solicitações) ----------

// Rota POST /consultas ORIGINAL, agora descontinuada para forçar o uso de /api/agenda/agendar.
app.post('/consultas', authMiddleware, (req, res) => {
    return res.status(400).json({ error: 'Rota de agendamento POST /consultas descontinuada. Use /api/agenda/agendar para agendamentos completos com título/motivo.' });
});

// =========================================================================
// ROTA ESPECÍFICA 1 (GET): ROTA PARA PSICÓLOGO VISUALIZAR SUAS SOLICITAÇÕES PENDENTES
// =========================================================================
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

// =========================================================================
// ROTA ESPECÍFICA 2 (GET): ROTA PARA LISTAR PACIENTES ATENDIDOS (ANOTAÇÕES)
// =========================================================================
app.get('/consultas/pacientes-atendidos', authMiddleware, (req, res) => {
    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem ver esta lista.' });
    }

    const query = `
        SELECT DISTINCT
            u.id_usuario AS id_paciente,
            u.nome AS nome_paciente
        FROM solicitacao_consulta s
        JOIN usuario u ON s.id_paciente = u.id_usuario
        WHERE s.id_psicologo = ? AND s.status IN ('aceita', 'confirmada', 'pendente')
        ORDER BY u.nome ASC;
    `;

    connection.query(query, [req.userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar pacientes atendidos para anotações:', err.message);
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }
        
        res.json(results);
    });
});


// =========================================================================
// ROTAS DE GERENCIAMENTO DE SESSÃO ESPECÍFICA (GET/POST/PUT /consultas/:id/session-note)
// =========================================================================

// GET /consultas/:id/session-note: Busca a anotação da sessão
app.get('/consultas/:id/session-note', authMiddleware, (req, res) => {
    const id_consulta = parseInt(req.params.id, 10);
    const id_psicologo = req.userId;

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem ver anotações de sessão.' });
    }
    if (isNaN(id_consulta)) {
        return res.status(400).json({ error: 'ID da consulta inválido.' });
    }

    // Busca a anotação vinculada ao ID da consulta e ao psicólogo
    const query = `
        SELECT id_anotacao, id_consulta, conteudo
        FROM anotacao_paciente
        WHERE id_consulta = ? AND id_psicologo = ?
    `;

    connection.query(query, [id_consulta, id_psicologo], (err, results) => {
        if (err) {
            console.error('Erro ao buscar anotação de sessão:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar anotação de sessão.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Nenhuma anotação encontrada para esta sessão.' });
        }

        res.json(results[0]);
    });
});

// POST /consultas/:id/session-note: Cria uma nova anotação para a sessão
app.post('/consultas/:id/session-note', authMiddleware, (req, res) => {
    const id_consulta = parseInt(req.params.id, 10);
    const id_psicologo = req.userId;
    const { id_paciente, conteudo } = req.body; 

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem criar anotações de sessão.' });
    }
    if (isNaN(id_consulta) || !id_paciente || !conteudo) {
        return res.status(400).json({ error: 'Dados inválidos ou incompletos.' });
    }

    // Cria a anotação, vinculando-a à consulta ID
    const query = `
        INSERT INTO anotacao_paciente (id_psicologo, id_usuario, id_consulta, data_anotacao, conteudo)
        VALUES (?, ?, ?, CURDATE(), ?)
    `;
    
    connection.query(query, [id_psicologo, id_paciente, id_consulta, conteudo], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Já existe uma anotação para esta consulta. Use PUT para atualizar.' });
            }
            console.error('Erro ao criar anotação de sessão:', err.message);
            return res.status(500).json({ error: 'Erro interno ao criar anotação.' });
        }
        res.status(201).json({ mensagem: 'Anotação criada com sucesso.', id_anotacao: result.insertId });
    });
});

// PUT /consultas/:id/session-note: Atualiza a anotação da sessão
app.put('/consultas/:id/session-note', authMiddleware, (req, res) => {
    const id_consulta = parseInt(req.params.id, 10);
    const id_psicologo = req.userId;
    const { conteudo } = req.body;

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem atualizar anotações de sessão.' });
    }
    if (isNaN(id_consulta) || !conteudo) {
        return res.status(400).json({ error: 'ID da consulta ou conteúdo inválido.' });
    }

    // Atualiza a anotação existente usando o ID da consulta e o ID do psicólogo como chaves
    const query = `
        UPDATE anotacao_paciente
        SET conteudo = ?, data_anotacao = CURDATE()
        WHERE id_consulta = ? AND id_psicologo = ?
    `;

    connection.query(query, [conteudo, id_consulta, id_psicologo], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar anotação de sessão:', err.message);
            return res.status(500).json({ error: 'Erro interno ao atualizar anotação.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Anotação não encontrada para esta sessão. Use POST para criar.' });
        }
        res.json({ mensagem: 'Anotação atualizada com sucesso.' });
    });
});


// =========================================================================
// ROTA GENÉRICA 1 (GET): ROTA PARA OBTER DETALHES DE UMA CONSULTA ESPECÍFICA
// =========================================================================
app.get('/consultas/:id', authMiddleware, (req, res) => {
    const consultaId = parseInt(req.params.id, 10);
    const userId = req.userId;

    if (isNaN(consultaId)) {
        return res.status(400).json({ error: 'ID da consulta inválido.' });
    }

    let query;
    let params;

    // A query precisa verificar se a consulta pertence ao psicólogo OU ao paciente logado.
    query = `
        SELECT
            sc.id_solicitacao,
            sc.data_solicitada,
            sc.motivo,
            sc.motivo_recusa,
            sc.status,
            sc.duracao_ms,
            u_paciente.id_usuario AS id_paciente,
            u_paciente.nome AS nome_paciente,
            u_psicologo.nome AS nome_psicologo
        FROM solicitacao_consulta sc
        JOIN usuario u_paciente ON sc.id_paciente = u.id_usuario
        JOIN usuario u_psicologo ON sc.id_psicologo = u_psicologo.id_usuario
        WHERE sc.id_solicitacao = ? 
          AND (sc.id_psicologo = ? OR sc.id_paciente = ?)
    `;
    params = [consultaId, userId, userId];

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro ao buscar detalhes da consulta:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar detalhes da consulta.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Consulta não encontrada ou acesso não permitido.' });
        }

        res.json(results[0]);
    });
});

// Rota para psicólogo responder a uma solicitação (PUT /consultas/:id)
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

// =========================================================================
// ROTA PARA ATUALIZAR A DURAÇÃO DA CONSULTA (PUT /consultas/:id/duracao)
// =========================================================================
app.put('/consultas/:id/duracao', authMiddleware, (req, res) => {
    const consultaId = parseInt(req.params.id, 10);
    const userId = req.userId;
    const { duracao_ms } = req.body;

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem registrar a duração da consulta.' });
    }

    if (isNaN(consultaId) || !duracao_ms || typeof duracao_ms !== 'number' || duracao_ms < 0) {
        return res.status(400).json({ error: 'ID da consulta ou duração (em ms) inválido.' });
    }

    // A atualização define o status como 'confirmada' (requer que 'confirmada' esteja no ENUM do DB)
    const query = `
        UPDATE solicitacao_consulta 
        SET duracao_ms = ?, status = 'confirmada'
        WHERE id_solicitacao = ? AND id_psicologo = ? AND status IN ('aceita', 'confirmada')
    `;

    connection.query(query, [duracao_ms, consultaId, userId], (err, result) => {
        if (err) {
            console.error('Erro ao registrar duração da consulta:', err.message);
            return res.status(500).json({ error: 'Erro interno ao salvar duração.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Consulta não encontrada, não agendada ou você não é o psicólogo responsável.' });
        }

        res.json({ mensagem: 'Duração da consulta salva e status atualizado para confirmada.', duracao_ms });
    });
});


// =========================================================================
// ROTA PARA OBTER DETALHES COMPLETOS DO PACIENTE PARA O PRONTUÁRIO
// =========================================================================
app.get('/consultas/pacientes/:id', authMiddleware, (req, res) => {
    // FIX: Garante que o ID é tratado como um inteiro
    const pacienteId = parseInt(req.params.id, 10); 
    const psicologoId = req.userId;

    // 1. Verificar se o usuário logado é um psicólogo
    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem visualizar o prontuário do paciente.' });
    }
    
    // Se o ID não for um número válido após o parseInt, retorna erro.
    if (isNaN(pacienteId)) {
        return res.status(400).json({ error: 'ID do paciente inválido.' });
    }


    // 2. Verificar se o psicólogo atende este paciente (tem alguma consulta aceita/pendente/confirmada)
    const checkQuery = `
        SELECT id_solicitacao FROM solicitacao_consulta 
        WHERE id_psicologo = ? AND id_paciente = ? AND status IN ('aceita', 'confirmada', 'pendente')
        LIMIT 1
    `;

    connection.query(checkQuery, [psicologoId, pacienteId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Erro ao verificar relacionamento psicólogo-paciente:', checkErr.message);
            return res.status(500).json({ error: 'Erro interno ao verificar permissão.' });
        }

        if (checkResults.length === 0) {
            return res.status(403).json({ error: 'Acesso negado. Você não está associado a este paciente.' });
        }

        // 3. Se a permissão for confirmada, busca todos os detalhes do paciente.
        const patientQuery = `
            SELECT nome, email, data_nascimento, genero, contato, cpf
            FROM usuario
            WHERE id_usuario = ?
        `;

        connection.query(patientQuery, [pacienteId], (patientErr, patientResults) => {
            if (patientErr) {
                console.error('Erro ao buscar perfil do paciente:', patientErr.message);
                return res.status(500).json({ error: 'Erro interno ao buscar dados do paciente.' });
            }

            if (patientResults.length === 0) {
                return res.status(404).json({ error: 'Paciente não encontrado ou perfil inválido.' });
            }

            // Retorna os dados do paciente
            res.json(patientResults[0]);
        });
    });
});

// =========================================================================
// ROTA PARA OBTER HISTÓRICO DE CONSULTAS DE UM PACIENTE
// =========================================================================
app.get('/consultas/pacientes/:id/historico', authMiddleware, (req, res) => {
    const pacienteId = parseInt(req.params.id, 10);
    const psicologoId = req.userId;

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem visualizar o histórico de consultas.' });
    }

    if (isNaN(pacienteId)) {
        return res.status(400).json({ error: 'ID do paciente inválido.' });
    }

    // Busca todas as solicitações para o par psicólogo-paciente
    const query = `
        SELECT
            id_solicitacao, 
            data_solicitada, 
            motivo, 
            status,
            motivo_recusa
        FROM solicitacao_consulta
        WHERE id_psicologo = ? AND id_paciente = ?
        ORDER BY data_solicitada DESC;
    `;

    connection.query(query, [psicologoId, pacienteId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar histórico de consultas:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar o histórico de consultas.' });
        }

        res.json(results);
    });
});

// =========================================================================
// ROTA PARA OBTER ANOTAÇÕES GERAIS DE UM PACIENTE (PARA HISTÓRICO NO PRONTUÁRIO)
// =========================================================================
app.get('/anotacoes/paciente/:id_paciente', authMiddleware, (req, res) => {
    const id_paciente = parseInt(req.params.id_paciente, 10);
    const id_psicologo = req.userId;

    if (!req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Apenas psicólogos podem ver anotações.' });
    }
    
    if (isNaN(id_paciente)) {
        return res.status(400).json({ error: 'ID do paciente inválido.' });
    }

    // 1. Verifica se o psicólogo atende o paciente
    const checkQuery = `
        SELECT id_solicitacao FROM solicitacao_consulta 
        WHERE id_psicologo = ? AND id_paciente = ? AND status IN ('aceita', 'confirmada', 'pendente')
        LIMIT 1
    `;

    connection.query(checkQuery, [id_psicologo, id_paciente], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Erro ao verificar relacionamento psicólogo-paciente para anotações:', checkErr.message);
            return res.status(500).json({ error: 'Erro interno ao verificar permissão.' });
        }

        if (checkResults.length === 0) {
            return res.status(403).json({ error: 'Acesso negado. Você não está associado a este paciente.' });
        }
        
        // 2. Se a permissão for concedida, busca as anotações.
        const notesQuery = `
            SELECT id_anotacao, data_anotacao, conteudo, id_consulta
            FROM anotacao_paciente
            WHERE id_usuario = ? AND id_psicologo = ?
            ORDER BY data_anotacao DESC;
        `;

        connection.query(notesQuery, [id_paciente, id_psicologo], (notesErr, notesResults) => {
            if (notesErr) {
                console.error('Erro ao buscar anotações do paciente:', notesErr.message);
                return res.status(500).json({ error: 'Erro interno ao buscar anotações.' });
            }

            res.json(notesResults);
        });
    });
});


// =========================================================================
// ROTA PARA OBTER REGISTROS DE PROGRESSO DO USUÁRIO (MODIFICADA)
// =========================================================================
app.get('/registros', authMiddleware, (req, res) => {
    const userId = req.userId;

    // Busca todos os registros de progresso do usuário logado, incluindo is_public
    const query = `
        SELECT id_registro, data, emocao, descricao, is_public 
        FROM registro_progresso
        WHERE id_usuario = ?
        ORDER BY data DESC;
    `;

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar registros de progresso:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar registros.' });
        }

        res.json(results);
    });
});
// =========================================================================

// =========================================================================
// ROTA PARA PUBLICAR UM REGISTRO (PUT /registros/:id/publish) - ADICIONADA
// =========================================================================
app.put('/registros/:id/publish', authMiddleware, (req, res) => {
    const registroId = parseInt(req.params.id, 10);
    const userId = req.userId;

    if (isNaN(registroId)) {
        return res.status(400).json({ error: 'ID do registro inválido.' });
    }

    // Define is_public como 1 (TRUE) para o registro do usuário logado
    const query = 'UPDATE registro_progresso SET is_public = 1 WHERE id_registro = ? AND id_usuario = ?';

    connection.query(query, [registroId, userId], (err, result) => {
        if (err) {
            console.error('Erro ao publicar registro:', err.message);
            return res.status(500).json({ error: 'Erro interno ao publicar o registro.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado ou você não tem permissão para publicá-lo.' });
        }

        res.json({ mensagem: 'Registro publicado com sucesso.' });
    });
});


// ---------- REGISTROS (MODIFICADA para incluir is_public=0 por padrão) ----------
app.post('/registros', authMiddleware, (req, res) => {
  const { data, emocao, descricao } = req.body;
  connection.query(
    'INSERT INTO registro_progresso (id_usuario, data, emocao, descricao, is_public) VALUES (?, ?, ?, ?, 0)', // ADICIONADO: 0 (false) como padrão
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

// ---------- COMENTÁRIOS (MANTIDOS) ----------

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

// ---------- CURTIDAS (MANTIDAS) ----------

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

// ---------- ANOTAÇÕES DE PACIENTE (MANTIDAS para anotações GERAIS/antigas) ----------

app.post('/pacientes', authMiddleware, (req, res) => {
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

app.put('/pacientes/:id', authMiddleware, (req, res) => {
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

app.delete('/pacientes/:id', authMiddleware, (req, res) => {
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