// controllers/disputeController.js
const pool = require("../config/db");

// ==========================
// 1. Crear disputa
// ==========================
exports.createDispute = async (req, res) => {
  const userId = req.user.id;
  const { projectId, description, policyAccepted } = req.body;

  if (!projectId || !description || !policyAccepted) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar que el usuario sea el cliente del proyecto
    const projectRes = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND client_id = $2`,
      [projectId, userId]
    );

    if (projectRes.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "No autorizado para abrir disputa" });
    }

    // Validar máximo número de disputas por proyecto
    const totalDisputes = await pool.query(
      `SELECT COUNT(*) FROM disputes WHERE project_id = $1`,
      [projectId]
    );

    if (parseInt(totalDisputes.rows[0].count, 10) >= 5) {
      return res.status(400).json({
        error: "Límite de disputas alcanzado para este proyecto.",
      });
    }

    // Verificar si existe una disputa reciente abierta o ya resuelta
    const existing = await pool.query(
      `SELECT * 
       FROM disputes 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [projectId]
    );

    if (existing.rows.length > 0) {
      const lastDispute = existing.rows[0];
      if (lastDispute.status === "open") {
        return res
          .status(400)
          .json({ error: "Ya existe una disputa abierta para este proyecto." });
      } else if (lastDispute.status === "resuelta") {
        return res.status(400).json({
          error: "Este proyecto ya fue resuelto por el administrador.",
        });
      }
    }

    // Crear nueva disputa
    const insertRes = await pool.query(
      `INSERT INTO disputes (
         project_id, 
         opened_by, 
         description, 
         policy_accepted, 
         status,
         created_at
       )
       VALUES ($1, $2, $3, $4, 'open', NOW())
       RETURNING *`,
      [projectId, userId, description, policyAccepted]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error("Error al crear disputa:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

// ==========================
// 2. Obtener disputas por proyecto (para el cliente actual)
//    ➜ /api/disputes/by-project/:projectId
// ==========================
exports.getDisputeByProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    // Disputa del usuario actual (cliente) para este proyecto
    const userDisputeRes = await pool.query(
      `SELECT *
       FROM disputes
       WHERE project_id = $1
         AND opened_by = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId, userId]
    );

    // Todas las disputas de este proyecto (para contar límite, etc.)
    const allDisputesRes = await pool.query(
      `SELECT *
       FROM disputes
       WHERE project_id = $1
       ORDER BY created_at ASC`,
      [projectId]
    );

    const response = {
      user: userDisputeRes.rows[0] || null,
      all: allDisputesRes.rows,
    };

    // Si no hay disputas en absoluto, devolvemos 404 con estructura vacía
    if (!response.user && response.all.length === 0) {
      return res.status(404).json(response);
    }

    res.json(response);
  } catch (err) {
    console.error("Error al obtener disputa por proyecto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ==========================
// 3. Logs de una disputa
//    ➜ /api/disputes/:id/logs
// ==========================
exports.getDisputeLogs = async (req, res) => {
  const disputeId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT * 
      FROM dispute_logs
      WHERE dispute_id = $1
      ORDER BY timestamp DESC
    `,
      [disputeId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener logs de disputa:", err);
    res.status(500).json({ error: "Error al obtener logs de disputa" });
  }
};
