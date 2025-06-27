CREATE DATABASE healsync;
USE healsync;

-- Tabela: usuario
CREATE TABLE usuario (
    ID_Usuario INT PRIMARY KEY AUTO_INCREMENT,
    Nome VARCHAR(100),
    Email VARCHAR(100),
    Senha VARCHAR(100),
    Data_Nascim DATE,
    Genero ENUM('Masculino', 'Feminino', 'Outro'),
    Data_Cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: psicologo
CREATE TABLE psicologo (
    ID_Psicologo INT PRIMARY KEY AUTO_INCREMENT,
    Nome VARCHAR(100),
    Especialidade VARCHAR(100),
    Contato VARCHAR(255),
    Avaliacao DECIMAL(2,1)
);

-- Tabela: consulta
CREATE TABLE consulta (
    ID_Consulta INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario INT,
    ID_Psicologo INT,
    Data_Hora DATETIME,
    Status ENUM('Agendada', 'Concluída', 'Cancelada'),
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario),
    FOREIGN KEY (ID_Psicologo) REFERENCES psicologo(ID_Psicologo)
);

-- Tabela: registro_progresso
CREATE TABLE registro_progresso (
    ID_Registro INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario INT,
    Data DATE,
    Emocao VARCHAR(100),
    Descricao TEXT,
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario)
);

-- Tabela: mensagens
CREATE TABLE mensagens (
    ID_Mensagem INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario_Origem INT,
    ID_Usuario_Destino INT,
    Conteudo TEXT,
    Data_Hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Usuario_Origem) REFERENCES usuario(ID_Usuario),
    FOREIGN KEY (ID_Usuario_Destino) REFERENCES usuario(ID_Usuario)
);

-- Tabela: interacao
CREATE TABLE interacao (
    ID_Interacao INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario INT,
    Tipo ENUM('Curtida', 'Comentário', 'Compartilhamento'),
    Conteudo TEXT,
    Data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario)
);