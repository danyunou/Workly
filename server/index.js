const express = require('express');
const cors = require('cors');
require('dotenv').config();
const env = require('./config/envConfig');
const app = express();

// 🔐 Configuración de CORS con dominios permitidos
const allowedOrigins = [
  'http://localhost:5173',
  'http://workly-frontend.s3-website.us-east-2.amazonaws.com',
  'https://workly-frontend.s3-website.us-east-2.amazonaws.com'
];

app.get("/", (req, res) => {
  res.send("Workly backend está corriendo");
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: This origin is not allowed.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


app.use('/api/_debug', require('./routes/_debug'));

// Rutas API organizadas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/paypal', require('./routes/paypal'));
app.use('/api/freelancerProfile', require('./routes/freelancerProfile'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/service-requests', require('./routes/serviceRequests'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api', require('./routes/ping'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Tarea programada para limpiar usuarios no verificados
const cron = require("node-cron");
const pool = require("./config/db");
const { cronLogger } = require("./utils/logger");

console.log("pool es:", typeof pool);
console.log("Dentro del cron:", typeof pool.query, pool.query);
cron.schedule("*/10 * * * *", async () => {
  try {
    const result = await pool.query(
      `DELETE FROM pending_users WHERE token_expires < NOW()`
    );
    const msg = `Registros expirados eliminados: ${result.rowCount}`;
    console.log("[CRON] " + msg);
    cronLogger.info(msg);
  } catch (err) {
    console.error("[CRON] Error al limpiar:", err.message);
    cronLogger.error(`Error al limpiar registros: ${err.message}`);
  }
});

// Ruta base
app.get("/", (req, res) => {
  res.send("Workly backend está corriendo");
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
