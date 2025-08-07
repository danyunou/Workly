const express = require('express');
const cors = require('cors');
require('dotenv').config();
const env = require('./config/envConfig');
const app = express();
app.use(cors());
app.use(express.json());

// Rutas API organizadas
app.use('/api/auth', require('./routes/auth'));                         // /api/auth/*
app.use('/api/services', require('./routes/services'));                // /api/services/*
app.use('/api/upload', require('./routes/upload'));                    // /api/upload/*
const paypalRoutes = require("./routes/paypal");
app.use("/api/paypal", paypalRoutes);                    // /api/paypal/*

const freelancerRoutes = require('./routes/freelancerProfile');
app.use('/api/freelancerProfile', freelancerRoutes);                   // /api/freelancerProfile/*

const requestRoutes = require("./routes/requests");
app.use("/api/requests", requestRoutes);

const proposalRoutes = require('./routes/proposals');
app.use('/api/proposals', proposalRoutes);  // ✅ Esta línea es la que debes agregar

const serviceRequestRoutes = require('./routes/serviceRequests');
app.use('/api/service-requests', serviceRequestRoutes);

app.use('/api/projects', require('./routes/projects'));

const disputeRoutes = require("./routes/disputes");
app.use("/api/disputes", disputeRoutes);

const pingRoutes = require('./routes/ping');
app.use("/api", pingRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

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
app.listen(5000, () => console.log('Server running on http://localhost:5000'));
