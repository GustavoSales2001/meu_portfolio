const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Railway / Render env vars:
 * - Preferência: DATABASE_URL (se existir)
 * - Alternativa: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL
 */

const {
  DATABASE_URL,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DB_SSL,
  NODE_ENV,
} = process.env;

let pool = null;

// Detecta se deve usar SSL
// Railway normalmente precisa SSL quando conecta via host público/proxy.
// No internal (mysql.railway.internal) pode funcionar sem SSL, mas deixar habilitado não atrapalha.
const shouldUseSSL = (() => {
  // se DB_SSL foi definido, respeita
  if (typeof DB_SSL !== "undefined") {
    return String(DB_SSL).toLowerCase() === "true";
  }

  // se estiver em produção, assume SSL
  if (NODE_ENV === "production") return true;

  // se tiver DATABASE_URL (railway), assume SSL
  if (DATABASE_URL) return true;

  return false;
})();

async function initDB() {
  try {
    if (DATABASE_URL) {
      // Usando URL completa (melhor opção no Railway se disponível)
      pool = mysql.createPool({
        uri: DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
      });
    } else if (DB_HOST && DB_USER && DB_PASSWORD && DB_NAME) {
      // Usando variáveis separadas
      pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: Number(DB_PORT || 3306),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      console.warn("⚠️ Banco NÃO configurado: defina DATABASE_URL ou DB_* no ambiente.");
      return;
    }

    // Teste de conexão
    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    conn.release();

    console.log("✅ Conectado ao MySQL (pool)!");
    console.log("🔒 SSL:", shouldUseSSL ? "ON" : "OFF");
  } catch (err) {
    console.error("❌ Erro ao conectar no MySQL:", err.message);
    pool = null;
  }
}

// Inicializa DB ao subir
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
    return res.status(500).json({ mensagem: "Banco ainda não configurado/conectado." });
  }

  try {
    const sql = "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";
    await pool.execute(sql, [nome, email, mensagem]);

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