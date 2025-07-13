CREATE DATABASE healsync; 
USE healsync;

-- Tabela: usuario (agora pode ser paciente ou psicólogo)
CREATE TABLE usuario (
    ID_Usuario INT PRIMARY KEY AUTO_INCREMENT,
    Nome VARCHAR(100),
    Email VARCHAR(100) UNIQUE,
    Senha VARCHAR(100),
    Data_Nascim DATE,
    Genero ENUM('Masculino', 'Feminino', 'Outro'),
    Eh_Psicologo BOOLEAN DEFAULT FALSE,
    Data_Cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: dados_psicologo (apenas para usuários que são psicólogos)
CREATE TABLE dados_psicologo (
    ID_Psicologo INT PRIMARY KEY, -- mesmo ID do usuario
    Especialidade VARCHAR(100),
    Contato VARCHAR(255),
    Avaliacao DECIMAL(2,1) DEFAULT 0.0,
    FOREIGN KEY (ID_Psicologo) REFERENCES usuario(ID_Usuario)
);

-- Tabela: consulta
CREATE TABLE consulta (
    ID_Consulta INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario INT,
    ID_Psicologo INT,
    Data_Hora DATETIME,
    Status ENUM('Agendada', 'Concluída', 'Recusada', 'Cancelada') DEFAULT 'Agendada',
    Motivo_Recusa TEXT,
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario),
    FOREIGN KEY (ID_Psicologo) REFERENCES usuario(ID_Usuario)
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

-- Tabela: anotacao_paciente (somente psicólogos podem adicionar)
CREATE TABLE anotacao_paciente (
    ID_Anotacao INT PRIMARY KEY AUTO_INCREMENT,
    ID_Psicologo INT,
    ID_Usuario INT,
    Data_Anotacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Conteudo TEXT,
    FOREIGN KEY (ID_Psicologo) REFERENCES usuario(ID_Usuario),
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario)
);

-- Tabela: interacao (mantida, pode ser usada para curtir conteúdos etc.)
CREATE TABLE interacao (
    ID_Interacao INT PRIMARY KEY AUTO_INCREMENT,
    ID_Usuario INT,
    Tipo ENUM('Curtida', 'Comentário', 'Compartilhamento'),
    Conteudo TEXT,
    Data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Usuario) REFERENCES usuario(ID_Usuario)
);
