const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config(); // local OK; no Railway não atrapalha

const app = express();

// ===== Segurança básica e parsing =====
app.disable("x-powered-by");
app.use(express.json({ limit: "50kb" }));

// ===== CORS (mais sênior: travar domínio) =====
// Coloque no Railway: ALLOWED_ORIGINS=https://gustavosales2001.github.io,https://gustavosales2001.github.io/meu_portfolio_site
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    // permite ferramentas sem origin (curl/postman) e permite tudo se lista vazia
    if (!origin || allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  }
}));

// ===== ENV =====
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = Number(process.env.DB_PORT || 3306);

function parseBool(v) {
  if (v === undefined || v === null) return false;
  return ["true", "1", "yes", "y", "sim", "verdadeiro"].includes(String(v).trim().toLowerCase());
}
const useSSL = parseBool(process.env.DB_SSL);

let pool;

// ===== Rate limit simples (sem dependência) =====
// Limite: 20 requests / 5 min por IP (ajustável)
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const hits = new Map();

app.use((req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();

  const item = hits.get(key) || { count: 0, start: now };
  if (now - item.start > RATE_LIMIT_WINDOW_MS) {
    item.count = 0;
    item.start = now;
  }
  item.count += 1;
  hits.set(key, item);

  if (item.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ mensagem: "Muitas requisições. Tente novamente em alguns minutos." });
  }

  next();
});

// ===== MYSQL (POOL) =====
async function initDB() {
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn("⚠️ MySQL não configurado. Verifique as Variables do Railway.");
    return;
  }

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  }).promise();

  try {
    await pool.query("SELECT 1");
    console.log("✅ Conectado ao MySQL!");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contatos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tabela 'contatos' pronta!");
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err.message);
    pool = null;
  }
}
initDB();

// ===== ROTAS =====
app.get("/", (req, res) => res.status(200).send("Servidor rodando 🚀"));
app.get("/health", async (req, res) => {
  if (!pool) return res.status(503).json({ ok: false, db: false });
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true, db: true });
  } catch {
    return res.status(503).json({ ok: false, db: false });
  }
});

function validateContato({ nome, email, mensagem }) {
  if (!nome || !email || !mensagem) return "Preencha todos os campos!";
  if (String(nome).length > 255) return "Nome muito longo.";
  if (String(email).length > 255) return "E-mail muito longo.";
  if (String(mensagem).length > 2000) return "Mensagem muito longa (máx 2000 caracteres).";
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
  if (!okEmail) return "E-mail inválido.";
  return null;
}

app.post("/contato", async (req, res) => {
  const { nome, email, mensagem } = req.body || {};

  const err = validateContato({ nome, email, mensagem });
  if (err) return res.status(400).json({ mensagem: err });

  if (!pool) {
    return res.status(500).json({
      mensagem: "Banco ainda não conectado. Verifique as variáveis do Railway.",
    });
  }

  try {
    const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";
    await pool.query(sql, [nome.trim(), email.trim(), mensagem.trim()]);
    return res.json({ mensagem: "Mensagem enviada com sucesso!" });
  } catch (e) {
    console.error("❌ Erro no INSERT:", e.message);
    return res.status(500).json({ mensagem: "Erro ao salvar no banco" });
  }
});

// Catch-all
app.use((req, res) => res.status(404).send("Rota não encontrada."));

// ===== SERVIDOR =====
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'efdcn0junction.proxy.rlwy.net',
      port: 54830,
      user: 'root',
      password: 'XyPsbqTWnvpIjQwWSGZQIQiRAnefdcmD',
      database: 'railway',
      ssl: {}
    });

    console.log('Conectado com sucesso ao MySQL!');
    await conn.end();
  } catch (err) {
    console.error('Erro ao conectar:', err.message);
  }
})();