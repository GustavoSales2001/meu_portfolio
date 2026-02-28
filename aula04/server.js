const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors()); // depois, se quiser, eu te ajudo a travar só no domínio do seu site
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

// ✅ IMPORTANTE: se você tinha app.get("*", ...), isso quebrava no Railway.
// Use "/*" (ou /.*/). Isso evita o erro do log.
app.get("/*", (req, res) => {
  res.status(404).send("Rota não encontrada.");
});

// ==================== SERVIDOR ====================

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
