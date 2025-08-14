CREATE DATABASE IF NOT EXISTS HealSyncDB;
USE HealSyncDB;

-- Tabela: usuario
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(45) NOT NULL,
    email VARCHAR(45) NOT NULL UNIQUE,
    senha VARCHAR(45) NOT NULL,
    data_nascimento DATE,
    genero enum('feminino','masculino','indefinido'),
    is_psicologo boolean,
    especialidade VARCHAR(45),
    contato VARCHAR(255),
    avaliacao DECIMAL(2,1)
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
CREATE TABLE solicitacao_consulta (
    id_solicitacao INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_psicologo INT NOT NULL,
    data_solicitada DATETIME NOT NULL,
    motivo_recusa TEXT DEFAULT NULL,
    status ENUM('pendente', 'aceita', 'recusada') NOT NULL DEFAULT 'pendente',
    FOREIGN KEY (id_paciente) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_psicologo) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: consulta
CREATE TABLE consulta (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_psicologo INT NOT NULL,
    data_hora DATETIME NOT NULL,
    status VARCHAR(45),
    motivo_recusa TEXT,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_psicologo) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- Tabela: registro_progresso
CREATE TABLE registro_progresso (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    data DATE,
    emocao VARCHAR(45),
    descricao TEXT,
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
    FOREIGN KEY (id_registro) REFERENCES registro_progresso(id_registro) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
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
