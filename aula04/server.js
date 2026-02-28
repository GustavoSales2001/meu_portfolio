const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

/**
 * ✅ CORS (IMPORTANTE para GitHub Pages)
 * Coloque aqui o domínio do seu site.
 * Você tem: https://gustavosales2001.github.io/meu_portfolio_site/
 * O origin correto é: https://gustavosales2001.github.io
 */
const ALLOWED_ORIGINS = [
  "https://gustavosales2001.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requests sem origin (ex: curl/postman)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

      return callback(new Error("CORS bloqueado para este origin: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ Responde o preflight (OPTIONS) — evita erro de CORS no navegador
app.options("*", cors());

app.use(express.json());

// ==================== ENV ====================
// Esperado no Railway:
// DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = Number(process.env.DB_PORT || 3306);

// Aceita: true / TRUE / 1 / yes / sim / verdadeiro
function parseBool(v) {
  if (v === undefined || v === null) return false;
  return ["true", "1", "yes", "y", "sim", "verdadeiro"].includes(
    String(v).trim().toLowerCase()
  );
}

const useSSL = parseBool(process.env.DB_SSL);

let pool;

// ==================== MYSQL (POOL) ====================
async function initDB() {
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn("⚠️ MySQL não configurado. Verifique as Variables do Railway.");
    return;
  }

  pool = mysql
    .createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // SSL somente se DB_SSL estiver true/verdadeiro
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    })
    .promise();

  try {
    await pool.query("SELECT 1");
    console.log("✅ Conectado ao MySQL!");

    // Cria a tabela automaticamente se não existir
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

// ==================== ROTAS ====================

app.get("/", (req, res) => {
  res.status(200).send("Servidor rodando 🚀");
});

// ✅ rota de saúde pra testar se o banco está conectado (não remove nada, só adiciona)
app.get("/health", async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ ok: true, db: "disconnected" });
    await pool.query("SELECT 1");
    return res.status(200).json({ ok: true, db: "connected" });
  } catch (e) {
    return res.status(200).json({ ok: true, db: "error" });
  }
});

app.post("/contato", async (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  if (!pool) {
    return res.status(500).json({
      mensagem: "Banco ainda não conectado. Verifique as variáveis do Railway.",
    });
  }

  try {
    const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";
    await pool.query(sql, [nome, email, mensagem]);

    return res.json({ mensagem: "Mensagem enviada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro no INSERT:", err.message);
    return res.status(500).json({ mensagem: "Erro ao salvar no banco" });
  }
});

// ==================== SERVIDOR ====================

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
