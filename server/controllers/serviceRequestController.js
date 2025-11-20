// server/controllers/serviceRequestController.js
const pool = require("../config/db");

/* ======================================================
   1. CREAR SOLICITUD DE SERVICIO (cliente -> freelancer)
   ====================================================== */
exports.createServiceRequest = async (req, res) => {
  const { service_id, message, proposed_deadline, proposed_budget } = req.body;
  const client_id = req.user.id;

  try {
    // 1) Evitar duplicados activos
    const existing = await pool.query(
      `
      SELECT id, status 
      FROM service_requests 
      WHERE service_id = $1 
        AND client_id = $2
        AND status IN ('pending_freelancer', 'rejected', 'accepted')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [service_id, client_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Ya existe una solicitud activa para este servicio.",
        request_id: existing.rows[0].id,
        status: existing.rows[0].status,
      });
    }

    // 2) Crear solicitud
    const result = await pool.query(
      `
      INSERT INTO service_requests (
        service_id,
        client_id,
        message,
        proposed_deadline,
        proposed_budget,
        status,
        revision,
        created_at,
        last_status_change_at
      )
      VALUES ($1, $2, $3, $4, $5, 'pending_freelancer', 1, NOW(), NOW())
      RETURNING *
      `,
      [
        service_id,
        client_id,
        message || null,
        proposed_deadline || null,
        proposed_budget || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating service request:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/* ======================================================
   2. OBTENER SOLICITUDES PARA EL FREELANCER
   ====================================================== */
exports.getRequestsForFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
         sr.*, 
         s.title AS service_title, 
         u.full_name AS client_name,
         u.username AS client_username,
         u.profile_picture AS client_pfp
       FROM service_requests sr
       JOIN services s ON sr.service_id = s.id
       JOIN users u ON sr.client_id = u.id
       WHERE s.freelancer_id = $1
       ORDER BY sr.created_at DESC`,
      [freelancerId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching service requests:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/* ======================================================
   3. RECHAZAR SOLICITUD + MOTIVO (freelancer)
   ====================================================== */
exports.rejectServiceRequest = async (req, res) => {
  const freelancerId = req.user.id;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT sr.*, s.freelancer_id AS owner_freelancer
      FROM service_requests sr
      JOIN services s ON s.id = sr.service_id
      WHERE sr.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada." });
    }

    const sr = result.rows[0];

    if (sr.owner_freelancer !== freelancerId) {
      return res.status(403).json({
        error: "No tienes permiso para rechazar esta solicitud.",
      });
    }

    if (sr.status !== "pending_freelancer") {
      return res.status(400).json({
        error: "Esta solicitud ya fue respondida.",
      });
    }

    const update = await pool.query(
      `
      UPDATE service_requests
      SET status = 'rejected',
          rejection_reason = $1,
          last_status_change_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [reason || null, id]
    );

    return res.json({
      message: "Solicitud rechazada correctamente.",
      request: update.rows[0],
    });
  } catch (err) {
    console.error("Error al rechazar solicitud:", err);
    return res
      .status(500)
      .json({ error: "Error interno al rechazar la solicitud." });
  }
};

/* ======================================================
   4. CLIENTE REENVÍA SOLICITUD RECHAZADA (revision++)
   ====================================================== */
exports.resendServiceRequest = async (req, res) => {
  const client_id = req.user.id;
  const { id } = req.params;
  const { message, proposed_deadline, proposed_budget } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM service_requests WHERE id = $1 AND client_id = $2`,
      [id, client_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada." });
    }

    const sr = result.rows[0];

    if (sr.status !== "rejected") {
      return res.status(400).json({
        error: "Solo puedes reenviar solicitudes rechazadas.",
      });
    }

    const update = await pool.query(
      `
      UPDATE service_requests
      SET message = $1,
          proposed_deadline = $2,
          proposed_budget = $3,
          status = 'pending_freelancer',
          rejection_reason = NULL,
          revision = revision + 1,
          last_status_change_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [message, proposed_deadline, proposed_budget, id]
    );

    return res.json({
      message: "Solicitud reenviada correctamente.",
      request: update.rows[0],
    });
  } catch (err) {
    console.error("Error al reenviar solicitud:", err);
    res.status(500).json({ error: "Error interno al reenviar." });
  }
};