const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let db;

if (process.env.DB_HOST) {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  db.connect(err => {
    if (err) {
      console.log("Erro ao conectar no MySQL:", err);
    } else {
      console.log("Conectado ao MySQL!");
    }
  });
}

// ROTAS FORA DO IF

app.get("/", (req, res) => {
  res.send("Servidor rodando 🚀");
});

app.post("/contato", (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.json({ mensagem: "Preencha todos os campos!" });
  }

  if (!db) {
    return res.json({ mensagem: "Banco ainda não configurado." });
  }

  const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";

  db.query(sql, [nome, email, mensagem], (err) => {
    if (err) {
      return res.status(500).json({ mensagem: "Erro ao salvar no banco" });
    }

    res.json({ mensagem: "Mensagem enviada com sucesso!" });
  });
});

//  SERVIDOR FORA DO IF

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});