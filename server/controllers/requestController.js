const pool = require("../config/db");

// Obtener solicitudes relacionadas con la(s) categoría(s) del freelancer
exports.getRequestsForFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT r.*
      FROM requests r
      WHERE r.category IN (
        SELECT UNNEST(categories)
        FROM freelancer_profiles
        WHERE user_id = $1
      )
      AND r.status = 'open'
      ORDER BY r.created_at DESC
    `, [freelancerId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener solicitudes para freelancer:", err);
    res.status(500).json({ error: "Error al obtener solicitudes para el freelancer" });
  }
};

exports.createRequest = async (req, res) => {
  const { title, description, budget, deadline, category } = req.body;
  const client_id = req.user.id;

  try {
    await pool.query(`
      INSERT INTO requests (title, description, budget, deadline, client_id, category)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [title, description, budget, deadline, client_id, category]);

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
