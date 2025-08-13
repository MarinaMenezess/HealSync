const mysql = require('mysql2')

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'HealSyncDB'
})

connection.connect((err)=>{
    if(err){
        console.error("Erro ao conectar ao banco de dados: " + err.stack)
        return
    }
    console.log("Conectado ao banco de dados!")
})

module.exports = connection