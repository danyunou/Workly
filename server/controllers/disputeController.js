// controllers/disputeController.js
const pool = require("../config/db");

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
      return res.status(403).json({ error: "No autorizado para abrir disputa" });
    }

    // Validar máximo número de disputas por proyecto
    const totalDisputes = await pool.query(
      `SELECT COUNT(*) FROM disputes WHERE project_id = $1`,
      [projectId]
    );

    if (parseInt(totalDisputes.rows[0].count) >= 5) {
      return res.status(400).json({ error: "Límite de disputas alcanzado para este proyecto." });
    }

    // Verificar si existe una disputa abierta o ya resuelta a favor
    const existing = await pool.query(
      `SELECT * FROM disputes WHERE project_id = $1 ORDER BY opened_at DESC LIMIT 1`,
      [projectId]
    );

    if (existing.rows.length > 0) {
      const lastDispute = existing.rows[0];
      if (lastDispute.status === "open") {
        return res.status(400).json({ error: "Ya existe una disputa abierta para este proyecto." });
      } else if (lastDispute.status === "resuelta") {
        return res.status(400).json({ error: "Este proyecto ya fue resuelto por el administrador." });
      }
    }

    // Crear nueva disputa
    const insertRes = await pool.query(
      `INSERT INTO disputes (project_id, opened_by, description, policy_accepted, status)
       VALUES ($1, $2, $3, $4, 'open') RETURNING *`,
      [projectId, userId, description, policyAccepted]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error("Error al crear disputa:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.getDisputeByProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM disputes WHERE project_id = $1 AND opened_by = $2 LIMIT 1`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No se encontró una disputa para este proyecto" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener disputa por proyecto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.getDisputeLogs = async (req, res) => {
  const disputeId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT * FROM dispute_logs
      WHERE dispute_id = $1
      ORDER BY timestamp DESC
    `, [disputeId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener logs de disputa:", err);
    res.status(500).json({ error: "Error al obtener logs de disputa" });
  }
};
