const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Config do banco via variáveis de ambiente
 * Render / Railway:
 * DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL
 */

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  DB_SSL,
} = process.env;

let db;

// Cria pool apenas se as variáveis existirem
if (DB_HOST && DB_USER && DB_PASSWORD && DB_NAME) {

  // Railway precisa SSL
  // ssl: DB_SSL === "false" ? undefined : { rejectUnauthorized: false },

  const useSSL = String(DB_SSL).toLowerCase() === "true";

  db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: Number(DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  });

  // Teste de conexão
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("❌ Erro ao conectar no MySQL:", err.message);
    } else {
      console.log("✅ Conectado ao MySQL (pool)!");
    }
  });
} else {
  console.warn(
    "⚠️ Variáveis do MySQL não configuradas. Configure no ambiente."
  );
}

// ==================== ROTAS ====================

app.get("/", (req, res) => {
  res.status(200).send("Servidor rodando 🚀");
});

app.post("/contato", (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  if (!db) {
    return res.status(500).json({ mensagem: "Banco ainda não configurado." });
  }

  const sql =
    "INSERT INTO contatos (nome, email, mensagem) VALUES (?, ?, ?)";

  db.query(sql, [nome, email, mensagem], (err) => {
    if (err) {
      console.error("❌ Erro no INSERT:", err.message);
      return res.status(500).json({ mensagem: "Erro ao salvar no banco" });
    }

    return res.json({ mensagem: "Mensagem enviada com sucesso!" });
  });
});

// ==================== SERVIDOR ====================

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});