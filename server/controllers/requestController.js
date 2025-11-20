//requestController.js
const pool = require("../config/db");

// Obtener solicitudes relacionadas con la(s) categoría(s) del freelancer
exports.getRequestsForFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
         sr.*, 
         s.title AS service_title, 
         u.full_name AS client_name,
         u.username AS client_username  
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

exports.createRequest = async (req, res) => {
  const { 
    title,
    description,
    budget,
    deadline,
    category,
    reference_links,
    additional_info
  } = req.body;

  const client_id = req.user.id;

  try {
    await pool.query(`
      INSERT INTO requests (
        title,
        description,
        budget,
        deadline,
        client_id,
        category,
        reference_links,
        additional_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      title,
      description,
      budget,
      deadline,
      client_id,
      category,
      reference_links && reference_links.length ? reference_links : null,
      additional_info || null
    ]);

    res.status(201).json({ message: "Solicitud creada correctamente" });
  } catch (err) {
    console.error("Error al crear solicitud:", err);
    res.status(500).json({ error: "Error al crear la solicitud" });
  }
};

exports.getRequestsByClient = async (req, res) => {
  const clientId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM requests WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener solicitudes del cliente:", err);
    res.status(500).json({ error: "Error al obtener tus solicitudes" });
  }
};
