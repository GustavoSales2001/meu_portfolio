const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(cors());

const DB_HOST = process.env.MYSQLHOST;
const DB_USER = process.env.MYSQLUSER;
const DB_PASSWORD = process.env.MYSQLPASSWORD;
const DB_NAME = process.env.MYSQLDATABASE;
const DB_PORT = Number(process.env.MYSQLPORT || 3306);

let pool;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query("SELECT 1");
    console.log("✅ Conectado ao MySQL!");
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err.message);
  }
}

initDB();

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.get("/health", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ ok: false, db: false, erro: "Pool não iniciado" });
    }

    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, erro: err.message });
  }
});

app.get("/teste-db", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ erro: "Pool não iniciado" });
    }

    const [rows] = await pool.query("SELECT NOW() as agora");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/init-db", async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ erro: "Pool não iniciado" });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contatos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255),
        email VARCHAR(255),
        mensagem TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.send("Tabela criada com sucesso!");
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/contato", async (req, res) => {
  const { nome, email, mensagem } = req.body;

  console.log("Recebido em /contato:", { nome, email, mensagem });

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  try {
    if (!pool) {
      return res.status(500).json({ mensagem: "Banco não conectado" });
    }

    const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";
    const [result] = await pool.query(sql, [nome, email, mensagem]);

    console.log("Contato salvo com ID:", result.insertId);

    res.json({ mensagem: "Mensagem enviada com sucesso!" });
  } catch (err) {
    console.error("Erro ao salvar contato:", err);
    res.status(500).json({ mensagem: err.message || "Erro ao enviar mensagem." });
  }
});