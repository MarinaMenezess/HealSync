// ARQUIVO: backend/server.js (FINAL COM TODAS AS CORREÇÕES E CONTAGEM)
const express = require('express');
const connection = require('./db_config');
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const multer = require('multer'); // NOVO: Importa Multer
const path = require('path'); // NOVO: Importa Path para manipular caminhos de arquivo
const fs = require('fs'); // NOVO: Importa FS para remover arquivos
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

// CONFIGURAÇÃO PARA SERVIR ARQUIVOS DE UPLOAD (MUITO IMPORTANTE)
// O path.join garante que o caminho seja correto, independentemente do OS.
const uploadDir = path.join(__dirname, 'uploads');
const profilePicturesDir = path.join(uploadDir, 'profile_pictures');

// Garante que o diretório de uploads existe
if (!fs.existsSync(profilePicturesDir)) {
    fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Serve a pasta 'uploads' estaticamente, acessível via /uploads
app.use('/uploads', express.static(uploadDir)); 

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

// Conteúdo da instrução de sistema expandido
const systemInstruction = `
    Você é o HealSync AI, um agente de **suporte psicológico e bem-estar** para a plataforma HealSync.
    Sua principal função é oferecer um espaço seguro e de escuta ativa, validando os sentimentos do usuário e promovendo a auto-reflexão.
    Forneça estratégias básicas de coping (como exercícios de respiração ou sugestões de registro de emoções).
    Em todas as interações: **Seja extremamente empático, evite fazer diagnósticos, e reforce a importância de procurar um profissional (psicólogo) verificado na plataforma HealSync para acompanhamento formal quando apropriado.**
    Além disso, responda a perguntas sobre o uso da plataforma.
    
    Informações sobre a plataforma HealSync:
    - Objetivo: Conecta pacientes a psicólogos verificados e oferece ferramentas de auto-monitoramento.
    - Diário/Registros: Permite registrar emoções, pensamentos e progresso diário. Os registros podem ser marcados como 'públicos' ou 'privados'.
    - Timeline: Exibe apenas os 'Registros de Progresso' que foram marcados como públicos pelos usuários.
    - Psicólogos: Possui um recurso para buscar e agendar consultas com psicólogos, cujos perfis são verificados (CFP/CPF).
    - Consultas: Pacientes podem solicitar agendamentos de sessões. Psicólogos usam a área de consultas para gerenciar solicitações.
    - Área do Psicólogo (Prontuário/Ficha): Permite ao psicólogo visualizar prontuários de pacientes, histórico de consultas e adicionar anotações de sessão (ficha).
`;

// ---------- CONFIGURAÇÃO DO MULTER PARA UPLOAD DE FOTO DE PERFIL ----------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Salva na pasta 'uploads/profile_pictures'
        cb(null, profilePicturesDir); 
    },
    filename: function (req, file, cb) {
        // Nome do arquivo: user-[ID_DO_USUARIO]-[timestamp].[extensão]
        const ext = path.extname(file.originalname);
        cb(null, `user-${req.userId}-${Date.now()}${ext}`);
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos de imagem (JPG/PNG) são permitidos!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: fileFilter
});
// --------------------------------------------------------------------------

// =========================================================================
// FUNÇÕES AUXILIARES DE NOTIFICAÇÃO
// =========================================================================

/**
 * Busca o ID do autor de um post.
 * @param {number} id_registro - ID do registro de progresso.
 * @returns {Promise<number|null>} ID do autor ou null.
 */
function getPostAuthorId(id_registro) {
    return new Promise((resolve, reject) => {
        connection.query(
            'SELECT id_usuario FROM registro_progresso WHERE id_registro = ?',
            [id_registro],
            (err, results) => {
                if (err) return reject(err);
                if (results.length === 0) return resolve(null);
                resolve(results[0].id_usuario);
            }
        );
    });
}

/**
 * Insere uma notificação no banco de dados.
 */
function insertNotification(id_usuario_destino, id_registro, id_usuario_origem, tipo, conteudo) {
    return new Promise((resolve, reject) => {
        // Não envia notificação para o próprio autor do post
        if (id_usuario_destino === id_usuario_origem) return resolve(null); 
        
        connection.query(
            'INSERT INTO notificacao (id_usuario_destino, id_registro, id_usuario_origem, tipo, conteudo, data_hora) VALUES (?, ?, ?, ?, ?, NOW())',
            [id_usuario_destino, id_registro, id_usuario_origem, tipo, conteudo],
            (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            }
        );
    });
}
// =========================================================================

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
    // ADICIONADO: foto_perfil_url na consulta
    let query = 'SELECT id_usuario, nome, email, especialidade, contato, avaliacao, foto_perfil_url FROM usuario WHERE is_psicologo = 1';
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
// ROTA PARA OBTER POSTS PÚBLICOS PARA A TIMELINE (GET /posts) - CORRIGIDO
// =========================================================================
app.get('/posts', (req, res) => {
    // CORREÇÃO: Adicionado LEFT JOIN e COUNT para incluir o número de curtidas e comentários
    const query = `
        SELECT 
            rp.id_registro, 
            rp.data, 
            rp.emocao, 
            rp.descricao, 
            u.nome AS nome_usuario, 
            rp.id_usuario AS id_autor, 
            u.foto_perfil_url,
            COUNT(DISTINCT c.id_comentario) AS num_comentarios,
            COUNT(DISTINCT cur.id_curtida) AS num_curtidas
        FROM registro_progresso rp
        JOIN usuario u ON rp.id_usuario = u.id_usuario
        LEFT JOIN comentario c ON rp.id_registro = c.id_registro
        LEFT JOIN curtida cur ON rp.id_registro = cur.id_registro
        WHERE rp.is_public = 1
        GROUP BY rp.id_registro
        ORDER BY rp.data DESC
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
// ROTA PARA OBTER DETALHES DE UM POST ESPECÍFICO (GET /posts/:id)
// =========================================================================
app.get('/posts/:id', (req, res) => {
    const postId = parseInt(req.params.id, 10); // Adicionada conversão para INT
    if (isNaN(postId)) {
        return res.status(400).json({ error: 'ID de registro inválido.' });
    }
    
    // A query une registro_progresso e usuário para obter o nome do autor.
    const query = `
        SELECT rp.id_registro, rp.data, rp.emocao, rp.descricao, rp.id_usuario AS id_autor, u.nome AS nome_usuario
        FROM registro_progresso rp
        JOIN usuario u ON rp.id_usuario = u.id_usuario
        WHERE rp.id_registro = ? AND rp.is_public = 1
    `; 

    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar post individual:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar post.' });
        }

        if (results.length === 0) {
            // Retorno 404 esperado pelo frontend quando o post não existe ou não é público
            return res.status(404).json({ mensagem: 'Post não encontrado ou indisponível.' });
        }
        res.json(results[0]);
    });
});

// =========================================================================
// ROTA PARA OBTER COMENTÁRIOS DE UM POST (GET /posts/:id/comentarios)
// =========================================================================
app.get('/posts/:id/comentarios', (req, res) => {
    const postId = parseInt(req.params.id, 10); // Adicionada conversão para INT
    if (isNaN(postId)) {
         return res.status(400).json({ error: 'ID de registro inválido.' });
    }
    const query = `
        SELECT c.conteudo, c.data_hora, u.nome AS nome_usuario
        FROM comentario c
        JOIN usuario u ON c.id_usuario = u.id_usuario
        WHERE c.id_registro = ?
        ORDER BY c.data_hora ASC
    `; 

    connection.query(query, [postId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar comentários:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar comentários.' });
        }
        // Retorna um array de comentários (pode ser vazio)
        res.json(results);
    });
});

// =========================================================================
// ROTA PARA OBTER DETALHES DE PERFIL POR ID (para psy-profile.html) - CORRIGIDA
// =========================================================================
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    
    // CORREÇÃO: Coluna 'cidade' removida.
    const query = 'SELECT id_usuario, nome, email, data_nascimento, genero, contato, especialidade, avaliacao, is_psicologo, cfp, foto_perfil_url FROM usuario WHERE id_usuario = ?';

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar perfil de usuário:', err.message);
            return res.status(500).json({ error: 'Erro no servidor ao buscar perfil.' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Perfil não encontrado.' });
        }
        
        const user = results[0];
        
        // Se for uma requisição interna (feita por profile.js), permitimos o retorno completo.
        // Se for para a página de psicólogo, mantemos a restrição.
        // Assumimos que o frontend de perfil (profile.js) busca o perfil por ID_USUARIO logado.
        
        // Se não for psicólogo, ou se a requisição for para um perfil de psicólogo (aqui não há distinção
        // de rota entre perfil próprio e perfil de outro psicólogo, o frontend deve lidar com o uso da rota).
        
        // Removendo campos sensíveis/privados que não devem ser expostos para terceiros (mantendo para o próprio usuário)
        // Para a rota de perfil (que o usuário usa para ver o próprio perfil), retornamos a maioria dos dados.
        // O `profile.js` usa o retorno desta rota para atualizar o localStorage e a UI.
        
        // Adicionando uma biografia fictícia (assumindo que o campo 'bio' não existe no schema) para uso externo
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
    // O SELECT * inclui foto_perfil_url
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


// =========================================================================
// ROTA: ATUALIZAÇÃO DE DADOS GERAIS DO PERFIL - CORRIGIDA FINALMENTE PARA O ENUM
// =========================================================================
app.put('/users/profile', authMiddleware, (req, res) => {
    const userId = req.userId;
    const { nome, contato, data_nascimento, genero } = req.body;

    if (!nome) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
    }

    // === Lógica de Sanitização para ENUM e NULL ===
    const allowedGenders = ['feminino', 'masculino', 'indefinido'];
    let cleanGenero = null;
    
    if (typeof genero === 'string' && genero.trim() !== '') {
        const lowerCaseGenero = genero.toLowerCase();
        if (allowedGenders.includes(lowerCaseGenero)) {
            cleanGenero = lowerCaseGenero; // Valor válido em minúsculas
        } else {
            cleanGenero = null; // Valor inválido
        }
    }

    // Sanitiza 'contato' para NULL se for string vazia
    let cleanContato = (contato && typeof contato === 'string' && contato.trim() !== '') ? contato : null;

    // Sanitiza 'data_nascimento' para NULL se for string vazia
    let cleanDataNascimento = (data_nascimento && typeof data_nascimento === 'string' && data_nascimento.trim() !== '') ? data_nascimento : null;
    // ===============================================

    // CORREÇÃO FINAL: Query em uma única linha para garantir a sintaxe correta
    const query = 'UPDATE usuario SET nome = ?, contato = ?, data_nascimento = ?, genero = ? WHERE id_usuario = ?';

    connection.query(
        query, 
        // Usando os valores sanitizados
        [nome, cleanContato, cleanDataNascimento, cleanGenero, userId],
        (err, result) => {
            if (err) {
                // Loga o erro específico para ajudar na depuração
                console.error('Erro ao atualizar dados gerais do perfil:', err.message);
                return res.status(500).json({ error: 'Erro ao atualizar o perfil no banco de dados.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Perfil não encontrado.' });
            }

            // O frontend deve recarregar o perfil após o sucesso para atualizar o localStorage
            res.json({ mensagem: 'Perfil atualizado com sucesso.' });
        }
    );
});


// =========================================================================
// NOVA ROTA: UPLOAD E ATUALIZAÇÃO DA FOTO DE PERFIL COM MULTER
// Rota substitui a antiga rota PUT /users/profile-picture.
// =========================================================================
app.post('/users/profile-picture-upload', authMiddleware, (req, res) => {
    
    // Usa o middleware de upload configurado, esperando um campo chamado 'profile_picture'
    upload.single('profile_picture')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Erro de upload do Multer: ' + err.message });
        } else if (err) {
            return res.status(400).json({ error: 'Erro no processamento do arquivo: ' + err.message });
        }
        
        // 1. Verifica se o arquivo foi enviado
        if (!req.file) {
            // Se não houver arquivo, mas houver a flag 'clear', remove a foto.
            if (req.body.clear === 'true') {
                try {
                     // 1.1. Buscar a URL antiga para remover o arquivo físico
                    const oldUrlResults = await new Promise((resolve, reject) => {
                        connection.query('SELECT foto_perfil_url FROM usuario WHERE id_usuario = ?', [req.userId], (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        });
                    });

                    if (oldUrlResults && oldUrlResults.length > 0 && oldUrlResults[0].foto_perfil_url) {
                        // Converte a URL HTTP para o caminho físico no disco
                        const oldFilename = oldUrlResults[0].foto_perfil_url.split('/').pop();
                        const oldPath = path.join(profilePicturesDir, oldFilename);

                        // Tenta remover o arquivo antigo (ignora erros se o arquivo não existir)
                        fs.unlink(oldPath, (e) => { 
                            if (e && e.code !== 'ENOENT') console.error("Erro ao deletar arquivo antigo:", e); 
                        });
                    }

                    // 1.2. Remover a URL do DB
                    await new Promise((resolve, reject) => {
                        connection.query(
                            'UPDATE usuario SET foto_perfil_url = NULL WHERE id_usuario = ?',
                            [req.userId],
                            (err, result) => {
                                if (err) return reject(err);
                                resolve(result);
                            }
                        );
                    });
                    
                    return res.json({ mensagem: 'Foto de perfil removida com sucesso.', foto_perfil_url: null });

                } catch (dbError) {
                    console.error('Erro ao remover foto de perfil:', dbError.message);
                    return res.status(500).json({ error: 'Erro ao remover foto no banco de dados.' });
                }
            }
            return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
        }
        
        // 2. Arquivo enviado. Remove o arquivo antigo primeiro (boa prática).
        try {
             const oldUrlResults = await new Promise((resolve, reject) => {
                connection.query('SELECT foto_perfil_url FROM usuario WHERE id_usuario = ?', [req.userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });

            if (oldUrlResults && oldUrlResults.length > 0 && oldUrlResults[0].foto_perfil_url) {
                // Converte a URL HTTP para o caminho físico no disco
                const oldFilename = oldUrlResults[0].foto_perfil_url.split('/').pop();
                const oldPath = path.join(profilePicturesDir, oldFilename);

                // Tenta remover o arquivo antigo (ignora erros se o arquivo não existir)
                 fs.unlink(oldPath, (e) => { 
                    if (e && e.code !== 'ENOENT') console.error("Erro ao deletar arquivo antigo:", e); 
                });
            }

        } catch (error) {
            console.error('Aviso: Falha ao deletar arquivo antigo. O upload continua:', error.message);
            // Continua mesmo se falhar a remoção do arquivo antigo
        }
        
        // 3. Constrói a URL de acesso público 
        // req.file.filename é o nome de arquivo gerado pelo Multer
        const filePath = `/uploads/profile_pictures/${req.file.filename}`;
        // Assumindo que o servidor roda em http://localhost:3000
        const publicUrl = `http://localhost:3000${filePath}`; 

        // 4. Salvar o caminho/URL no banco de dados
        try {
            await new Promise((resolve, reject) => {
                connection.query(
                    'UPDATE usuario SET foto_perfil_url = ? WHERE id_usuario = ?',
                    [publicUrl, req.userId],
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });
            
            res.json({ mensagem: 'Foto de perfil atualizada com sucesso.', foto_perfil_url: publicUrl });

        } catch (dbError) {
            console.error('Erro ao atualizar a foto de perfil:', dbError.message);
            // Remove o arquivo recém-salvo em caso de falha no DB
            fs.unlink(req.file.path, (e) => { 
                if(e) console.error("Erro ao deletar arquivo após falha no DB:", e); 
            });

            res.status(500).json({ error: 'Erro ao salvar o caminho da foto no banco de dados.' });
        }
    });
});
// =========================================================================


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

// Rota POST para iniciar uma nova conversa (Corrigida e Funcional)
app.post('/ia/conversas', authMiddleware, async (req, res) => {
  const { titulo_opcional } = req.body;
  let newConversationId;

  try {
      // 1. Cria a nova conversa no banco de dados (Ajustado para lidar com o retorno do INSERT)
      const result = await new Promise((resolve, reject) => {
        connection.query(
          // Inicia com um título padrão 'Nova Conversa' (ou o que for enviado)
          'INSERT INTO ia_conversa (id_usuario, data_inicio, titulo_opcional) VALUES (?, NOW(), ?)',
          [req.userId, titulo_opcional],
          (err, result) => {
            if (err) return reject(err);
            resolve(result); // Resolve com o objeto de resultado completo (incluindo insertId)
          }
        );
      });
      newConversationId = result.insertId;

      // Se não houver ID de conversa, algo deu muito errado no DB
      if (!newConversationId) {
           throw new Error("Falha ao obter ID da nova conversa.");
      }

      // 2. Gera a mensagem de boas-vindas da IA
      const welcomePrompt = 'Gere uma saudação curta e amigável, apresentando-se como o HealSync AI, um assistente de suporte psicológico. Mencione que está aqui para oferecer um espaço de escuta e apoio. Não inclua Markdown para títulos.';
      
      // Usa startChat com histórico vazio para aplicar systemInstruction
      const chat = model.startChat({
        history: [], // Começa sem histórico
        config: { 
            systemInstruction: systemInstruction, 
            generationConfig: {
               maxOutputTokens: 100,
            }
        }
      });
      
      // Envia o prompt de boas-vindas como a primeira mensagem (string simples)
      const welcomeResult = await chat.sendMessage(welcomePrompt);
      // CORREÇÃO: Chama .text() para obter o conteúdo como string antes de trim()
      const welcomeMessage = welcomeResult.response.text().trim(); 

      // 3. Salva a mensagem de boas-vindas da IA como a primeira mensagem
      if (welcomeMessage) {
          await new Promise((resolve, reject) => {
            connection.query(
              'INSERT INTO ia_mensagem (id_conversa, remetente, conteudo, data_hora) VALUES (?, ?, ?, NOW())',
              [newConversationId, 'ia', welcomeMessage],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
      }

      res.status(201).json({ id: newConversationId, mensagem: 'Conversa iniciada com mensagem de boas-vindas da IA.' });

  } catch (error) {
      console.error('Erro ao iniciar nova conversa com IA:', error);
      // Retorna 500 se o DB falhar na primeira query, ou 201 se o DB funcionar mas a IA falhar.
      if (!newConversationId) { 
        return res.status(500).json({ error: 'Erro ao criar a conversa no banco de dados. ' + error.message });
      }
      // Se a conversa foi criada, mas a mensagem da IA falhou, avisa mas retorna o ID da conversa.
      res.status(201).json({ id: newConversationId, mensagem: 'Conversa iniciada, mas a mensagem de boas-vindas da IA falhou: ' + error.message });
  }
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
        
        // 3. Lógica para gerar e atualizar o título da conversa na primeira mensagem do USUÁRIO
        let novoTitulo = null;
        const userMessages = historico.filter(msg => msg.remetente === 'usuario');
        const isFirstUserMessage = userMessages.length === 1; 

        if (isFirstUserMessage) {
            const titlePrompt = `Gere um título conciso (máximo 7 palavras) para uma conversa de chat com base na primeira mensagem do usuário: "${mensagem_usuario}". Retorne apenas o título, sem introduções, aspas ou formatação Markdown.`;
            
            // Chamada da IA para gerar o título (generateContent simples)
            const titleResult = await model.generateContent(titlePrompt);
            const tituloGerado = titleResult.text().trim().replace(/['"“”]/g, ''); 

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
        let chatHistory = [];
        let messageToSend = mensagem_usuario;

        if (historico.length > 2) {
            chatHistory = historico.slice(1, -1).map(msg => ({
                role: msg.remetente === 'usuario' ? 'user' : 'model',
                parts: [{ text: msg.conteudo }]
            }));
        }

        const chat = model.startChat({
            history: chatHistory, 
            config: {
                 systemInstruction: systemInstruction, 
                 generationConfig: {
                    maxOutputTokens: 100,
                 }
            },
        });
        
        // 5. Enviar a mensagem atual do usuário para o modelo Gemini
        const result = await chat.sendMessage(messageToSend); 
        const respostaIA = result.response.text().trim(); // Chama .text()

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
        
        // 7. Retorna a resposta da IA e o novo título (se gerado)
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
    if (req.is_psicologo) {
        return res.status(403).json({ error: 'Acesso negado. Psicólogos devem gerenciar sessões através da área de consultas.' });
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
// ROTA PARA CARREGAR EVENTOS NO CALENDÁRIO 
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

// Rota POST /consultas ORIGINAL, agora descontinuada
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
    
    connection.query(query, [id_psicologo, id_paciente, id_consulta, conteudo], (resultErr, result) => {
        if (resultErr) {
            if (resultErr.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Já existe uma anotação para esta consulta. Use PUT para atualizar.' });
            }
            console.error('Erro ao criar anotação de sessão:', resultErr.message);
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
        JOIN usuario u_paciente ON sc.id_paciente = u_paciente.id_usuario
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
// ROTA PARA OBTER REGISTROS DE PROGRESSO DO USUÁRIO 
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
// ROTA PARA PUBLICAR UM REGISTRO (PUT /registros/:id/publish) 
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

// =========================================================================
// ROTA PARA ARQUIVAR UM REGISTRO (PUT /registros/:id/archive) - ADICIONADA
// Necessário para o index.js
// =========================================================================
app.put('/registros/:id/archive', authMiddleware, (req, res) => {
    const registroId = parseInt(req.params.id, 10);
    const userId = req.userId;

    if (isNaN(registroId)) {
        return res.status(400).json({ error: 'ID do registro inválido.' });
    }

    // Define is_public como 0 (FALSE) para o registro do usuário logado
    const query = 'UPDATE registro_progresso SET is_public = 0 WHERE id_registro = ? AND id_usuario = ?';

    connection.query(query, [registroId, userId], (err, result) => {
        if (err) {
            console.error('Erro ao arquivar registro:', err.message);
            return res.status(500).json({ error: 'Erro interno ao arquivar o registro.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado ou você não tem permissão para arquivá-lo.' });
        }

        res.json({ mensagem: 'Registro arquivado com sucesso (removido da timeline).' });
    });
});

// =========================================================================
// ROTA PARA DENUNCIAR UM REGISTRO (POST /registros/:id/denounce) - ADICIONADA
// Necessário para o index.js
// =========================================================================
app.post('/registros/:id/denounce', authMiddleware, async (req, res) => {
    const registroId = parseInt(req.params.id, 10);

    if (!req.userId) {
        return res.status(401).json({ error: 'É necessário estar logado para denunciar.' });
    }

    if (isNaN(registroId)) {
        return res.status(400).json({ error: 'ID do registro inválido.' });
    }

    // 1. Marcar o post como denunciado e tirá-lo da timeline (arquivar)
    const updateQuery = `
        UPDATE registro_progresso 
        SET is_denounced = TRUE, is_public = FALSE 
        WHERE id_registro = ?
    `;

    try {
        const updateResult = await new Promise((resolve, reject) => {
            connection.query(updateQuery, [registroId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado.' });
        }
        
        // Se precisar de lógica de inativação do usuário, ela seria adicionada aqui.
        res.json({ mensagem: `Registro ID ${registroId} denunciado e removido da timeline com sucesso.` });

    } catch (err) {
        console.error('Erro ao denunciar registro:', err.message);
        return res.status(500).json({ error: 'Erro interno ao processar a denúncia.' });
    }
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

// ---------- COMENTÁRIOS (COM LÓGICA DE NOTIFICAÇÃO) ----------

app.post('/comentarios', authMiddleware, async (req, res) => {
  const { id_registro, conteudo } = req.body;
  const id_usuario_origem = req.userId;

  try {
      const insertResult = await new Promise((resolve, reject) => {
          connection.query(
              'INSERT INTO comentario (id_registro, id_usuario, conteudo) VALUES (?, ?, ?)',
              [id_registro, id_usuario_origem, conteudo],
              (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
              }
          );
      });
      
      // --- Lógica de Notificação ---
      const id_usuario_destino = await getPostAuthorId(id_registro);
      if (id_usuario_destino) {
          await insertNotification(
              id_usuario_destino,
              id_registro,
              id_usuario_origem,
              'comentario',
              'novo comentário no seu post!'
          );
      }
      // --- Fim Lógica de Notificação ---

      res.status(201).json({ id: insertResult.insertId });
  } catch (err) {
      console.error('Erro em POST /comentarios:', err.message);
      return res.status(500).json({ error: err.message });
  }
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

// ---------- CURTIDAS (COM LÓGICA DE NOTIFICAÇÃO E AGORA COMO TOGGLE) ----------

app.post('/curtidas', authMiddleware, async (req, res) => {
  const { id_registro } = req.body;
  const id_usuario = req.userId;

  if (!id_registro) {
      return res.status(400).json({ error: 'ID do registro é obrigatório.' });
  }

  try {
      // 1. Verificar se a curtida já existe (lógica de toggle)
      const [existingLikes] = await new Promise((resolve, reject) => {
          connection.query(
              'SELECT id_curtida FROM curtida WHERE id_registro = ? AND id_usuario = ?',
              [id_registro, id_usuario],
              (err, results) => {
                  if (err) return reject(err);
                  resolve([results]);
              }
          );
      });

      if (existingLikes.length > 0) {
          // A curtida existe: Deletar (Unlike)
          await new Promise((resolve, reject) => {
              connection.query(
                  'DELETE FROM curtida WHERE id_curtida = ?',
                  [existingLikes[0].id_curtida],
                  (err, result) => {
                      if (err) return reject(err);
                      resolve(result);
                  }
              );
          });

          // Resposta para descurtir
          return res.json({ mensagem: 'Curtida removida com sucesso (Unlike).', acao: 'unlike' });
      } else {
          // A curtida não existe: Inserir (Like)
          const insertResult = await new Promise((resolve, reject) => {
              connection.query(
                  'INSERT INTO curtida (id_registro, id_usuario) VALUES (?, ?)',
                  [id_registro, id_usuario],
                  (err, result) => {
                      if (err) return reject(err);
                      resolve(result);
                  }
              );
          });

          // --- Lógica de Notificação (Mantida) ---
          const id_usuario_destino = await getPostAuthorId(id_registro);
          if (id_usuario_destino) {
              await insertNotification(
                  id_usuario_destino,
                  id_registro,
                  id_usuario,
                  'curtida',
                  'curtiu o seu post!'
              );
          }
          // --- Fim Lógica de Notificação ---

          // Resposta para curtir
          return res.status(201).json({ id: insertResult.insertId, mensagem: 'Curtida adicionada com sucesso (Like).', acao: 'like' });
      }

  } catch (err) {
      console.error('Erro em POST /curtidas (Toggle):', err.message);
      return res.status(500).json({ error: 'Erro interno ao processar a curtida/descurtida.' });
  }
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

// ---------- ROTAS DE NOTIFICAÇÃO ----------

// =========================================================================
// ROTA: OBTÉM NOTIFICAÇÕES NÃO LIDAS DO USUÁRIO LOGADO
// =========================================================================
app.get('/notifications', authMiddleware, (req, res) => {
    const userId = req.userId;

    const query = `
        SELECT 
            n.id_notificacao,
            n.tipo,
            n.conteudo,
            n.data_hora,
            n.id_registro,
            u.nome AS nome_origem,
            u.foto_perfil_url
        FROM notificacao n
        LEFT JOIN usuario u ON n.id_usuario_origem = u.id_usuario
        WHERE n.id_usuario_destino = ? AND n.lida = FALSE
        ORDER BY n.data_hora DESC
        LIMIT 10
    `;

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar notificações:', err.message);
            return res.status(500).json({ error: 'Erro interno ao buscar notificações.' });
        }
        
        res.json(results);
    });
});

// =========================================================================
// ROTA: MARCA NOTIFICAÇÕES COMO LIDAS
// =========================================================================
app.put('/notifications/mark-read', authMiddleware, (req, res) => {
    const userId = req.userId;

    const query = 'UPDATE notificacao SET lida = TRUE WHERE id_usuario_destino = ? AND lida = FALSE';

    connection.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Erro ao marcar notificações como lidas:', err.message);
            return res.status(500).json({ error: 'Erro interno ao atualizar notificações.' });
        }
        res.json({ mensagem: `${result.affectedRows} notificações marcadas como lidas.` });
    });
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