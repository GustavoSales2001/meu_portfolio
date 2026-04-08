const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ===== Config básica =====
app.disable("x-powered-by");
app.use(express.json());

// ===== CORS =====
app.use(cors());

// ===== Variáveis do Railway =====
const DB_HOST = process.env.MYSQLHOST;
const DB_USER = process.env.MYSQLUSER;
const DB_PASSWORD = process.env.MYSQLPASSWORD;
const DB_NAME = process.env.MYSQLDATABASE;
const DB_PORT = Number(process.env.MYSQLPORT || 3306);

// ===== Pool de conexão =====
let pool;

async function initDB() {
  try {
    pool = await mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query("SELECT 1");
    console.log("✅ Conectado ao MySQL!");
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err.message);
  }
}

initDB();

// ===== ROTAS =====

// Teste básico
app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.status(500).json({ ok: false, db: false });
  }
});

// Teste de banco
app.get("/teste-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() as agora");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Criar tabela automaticamente (opcional)
app.get("/init-db", async (req, res) => {
  try {
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

// Inserir contato
app.post("/contato", async (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  try {
    const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";
    await pool.query(sql, [nome, email, mensagem]);

    res.json({ mensagem: "Mensagem enviada com sucesso!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rota padrão
app.use((req, res) => {
  res.status(404).send("Rota não encontrada.");
});

// ===== Servidor =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});