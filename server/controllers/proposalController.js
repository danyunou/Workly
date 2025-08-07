const pool = require("../config/db");

exports.getProposalsByRequest = async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*, u.full_name AS freelancer_name, u.profile_picture
       FROM proposals p
       JOIN users u ON p.freelancer_id = u.id
       WHERE p.request_id = $1`,
      [requestId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener propuestas:", err);
    res.status(500).json({ error: "Error al obtener propuestas" });
  }
};

exports.acceptProposal = async (req, res) => {
  const { proposalId } = req.params;
  const clientId = req.user.id;

  try {
    // Verificar que la propuesta exista y pertenezca a una solicitud del cliente
    const proposalCheck = await pool.query(
      `SELECT p.*, r.client_id FROM proposals p
       JOIN requests r ON p.request_id = r.id
       WHERE p.id = $1`,
      [proposalId]
    );

    if (proposalCheck.rows.length === 0) {
      return res.status(404).json({ error: "Propuesta no encontrada" });
    }

    const proposal = proposalCheck.rows[0];
    if (proposal.client_id !== clientId) {
      return res.status(403).json({ error: "No autorizado para aceptar esta propuesta" });
    }

    // Cambiar estado de la solicitud a "contratada"
    await pool.query(
      `UPDATE requests SET status = 'hired' WHERE id = $1`,
      [proposal.request_id]
    );

    // Cambiar estado de todas las demás propuestas a "rechazada", menos la aceptada
    await pool.query(
      `UPDATE proposals SET status = 'rejected' WHERE request_id = $1 AND id != $2`,
      [proposal.request_id, proposalId]
    );

    // Cambiar estado de la propuesta aceptada
    await pool.query(
      `UPDATE proposals SET status = 'accepted' WHERE id = $1`,
      [proposalId]
    );

    // Crear entrada en tabla projects (modo standby)
    await pool.query(
      `INSERT INTO projects (request_id, freelancer_id, client_id, status, created_at)
       VALUES ($1, $2, $3, 'pending_contract', NOW())`,
      [proposal.request_id, proposal.freelancer_id, clientId]
    );

    res.json({ message: "Propuesta aceptada y proyecto creado." });
  } catch (err) {
    console.error("Error al aceptar propuesta:", err);
    res.status(500).json({ error: "Error al aceptar propuesta" });
  }
};

exports.sendProposal = async (req, res) => {
  const { requestId } = req.params;
  const freelancerId = req.user.id;
  const { message, proposed_price, proposed_deadline } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM proposals WHERE request_id = $1 AND freelancer_id = $2`,
      [requestId, freelancerId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ error: "You have already submitted a proposal to this request." });
    }

    const result = await pool.query(
      `INSERT INTO proposals (request_id, freelancer_id, message, proposed_price, proposed_deadline)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [requestId, freelancerId, message, proposed_price, proposed_deadline]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error sending proposal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};