CREATE DATABASE IF NOT EXISTS HealSyncDB;
USE HealSyncDB;

-- Tabela: usuario
-- MANTIDO: 'avaliacao' já está presente.
CREATE TABLE usuario (
id_usuario INT AUTO_INCREMENT PRIMARY KEY,
firebase_uid VARCHAR(128) NOT NULL UNIQUE, 
nome VARCHAR(45) NOT NULL,
email VARCHAR(45) NOT NULL UNIQUE,
data_nascimento DATE,
genero enum('feminino','masculino','indefinido'),
cidade VARCHAR(45) NULL,
is_psicologo boolean,
especialidade VARCHAR(45),
contato VARCHAR(255),
cfp VARCHAR(45), 
cpf VARCHAR(14), 
avaliacao DECIMAL(2,1),
is_active_for_posting BOOLEAN DEFAULT TRUE,
foto_perfil_url VARCHAR(2048) NULL
);

-- Tabela: ia_conversa
CREATE TABLE ia_conversa (
id_conversa INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT NOT NULL,
data_inicio DATETIME,
titulo_opcional VARCHAR(45),
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: ia_mensagem
CREATE TABLE ia_mensagem (
id_mensagem INT AUTO_INCREMENT PRIMARY KEY,
id_conversa INT NOT NULL,
remetente ENUM('usuario', 'ia') NOT NULL,
conteudo TEXT NOT NULL,
data_hora DATETIME,
FOREIGN KEY (id_conversa) REFERENCES ia_conversa(id_conversa) ON DELETE CASCADE
);

-- Tabela: solicitacao_consulta
-- NOVO: Adicionado campo 'motivo' e corrigido ENUM para incluir 'confirmada'
CREATE TABLE solicitacao_consulta (
id_solicitacao INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT NOT NULL,
id_psicologo INT NOT NULL,
data_solicitada DATETIME NOT NULL,
motivo TEXT NOT NULL, -- CAMPO ADICIONADO: Descrição/Motivação da solicitação
motivo_recusa TEXT DEFAULT NULL, -- Campo para motivo de recusa (mantido)
status ENUM('pendente', 'aceita', 'recusada', 'confirmada') NOT NULL DEFAULT 'pendente', -- STATUS 'confirmada' ADICIONADO
duracao_ms BIGINT DEFAULT NULL, -- COLUNA ADICIONADA PARA O TEMPO DO CRONÔMETRO
FOREIGN KEY (id_paciente) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
FOREIGN KEY (id_psicologo) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: registro_progresso
CREATE TABLE registro_progresso (
id_registro INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT NOT NULL,
data DATE,
emocao VARCHAR(45),
descricao TEXT,
is_public BOOLEAN DEFAULT FALSE, -- ADICIONADO: Campo para definir se o registro é público
is_denounced BOOLEAN DEFAULT FALSE,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: comentario
CREATE TABLE comentario (
id_comentario INT AUTO_INCREMENT PRIMARY KEY,
id_registro INT NOT NULL,
id_usuario INT NOT NULL,
conteudo TEXT,
data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (id_registro) REFERENCES registro_progresso(id_registro) ON DELETE CASCADE,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: curtida
CREATE TABLE curtida (
id_curtida INT AUTO_INCREMENT PRIMARY KEY,
id_registro INT NOT NULL,
id_usuario INT NOT NULL,
UNIQUE KEY unique_curtida_por_usuario (id_registro, id_usuario)
);

-- Tabela: anotacao_paciente
CREATE TABLE anotacao_paciente (
id_anotacao INT AUTO_INCREMENT PRIMARY KEY,
id_psicologo INT NOT NULL,
id_usuario INT NOT NULL,
data_anotacao DATE,
conteudo TEXT,
FOREIGN KEY (id_psicologo) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Adicionado ao seu arquivo db.sql
CREATE TABLE notificacao (
    id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_destino INT NOT NULL, -- O usuário que deve receber a notificação
    id_registro INT,                -- MANTIDA, mas sem FK. Armazena o ID do post OU o ID da solicitacao_consulta.
    id_usuario_origem INT,            -- O usuário que iniciou o evento
    tipo ENUM('curtida', 'comentario', 'nova_consulta', 'consulta_aceita', 'consulta_recusada', 'avaliacao_pendente') NOT NULL,
    conteudo VARCHAR(255) NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    lida BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_usuario_destino) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- FK REMOVIDA: FOREIGN KEY (id_registro) REFERENCES registro_progresso(id_registro) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_origem) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

-- Crie esta tabela se ela não existir
CREATE TABLE avaliacao_psicologo (
    id_avaliacao INT AUTO_INCREMENT PRIMARY KEY,
    id_psicologo INT NOT NULL,
    id_paciente INT NOT NULL,
    nota INT NOT NULL, -- Valor de 1 a 5
    justificativa TEXT,
    data_avaliacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_psicologo) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_paciente) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- Garante que um paciente avalia o mesmo psicólogo apenas uma vez (ou controle via código na aplicação)
    UNIQUE KEY unique_rating (id_psicologo, id_paciente) 
);

-- COMANDOS AUXILIARES: DROP DATABASE e UPDATE MANTIDOS
INSERT INTO usuario (nome, email, firebase_uid, is_psicologo, cfp, cpf, contato, especialidade) VALUES ('psicologo', 'psicologo@gmail.com', 'aSsX8eDAZ6QaVf4r8FjL0x1WQ8G3', true, '561234', '04631588063', '997755386', 'TCC e EMDR');
INSERT INTO usuario (nome, email, firebase_uid, data_nascimento, genero) VALUES ('teste', 'teste@gmail.com', 'NUKQm3Bj7caoZ8mQBz1L7E36Ns12', '2007-07-27', 'feminino');