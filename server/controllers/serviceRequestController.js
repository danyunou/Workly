const pool = require("../config/db");

exports.createServiceRequest = async (req, res) => {
  const { service_id, message, proposed_deadline } = req.body;
  const client_id = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO service_requests (service_id, client_id, message, proposed_deadline)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [service_id, client_id, message, proposed_deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating service request:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.getRequestsForFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT sr.*, s.title AS service_title, u.full_name AS client_name
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
