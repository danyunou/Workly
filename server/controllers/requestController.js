// server/controllers/requestController.js
const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

// 🔹 Crear una custom request pública (cliente -> marketplace)
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
    await pool.query(
      `INSERT INTO requests (
        title,
        description,
        budget,
        deadline,
        client_id,
        category,
        reference_links,
        additional_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        title,
        description,
        budget || null,
        deadline || null,
        client_id,
        category,
        reference_links && reference_links.length ? reference_links : null,
        additional_info || null
      ]
    );

    res.status(201).json({ message: "Solicitud creada correctamente" });
  } catch (err) {
    console.error("Error al crear solicitud:", err);
    res.status(500).json({ error: "Error al crear la solicitud" });
  }
};

// 🔹 Custom requests relevantes para un freelancer (para el dashboard)
exports.getRequestsForFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    // 1) Obtenemos las categorías configuradas en el perfil del freelancer
    const profileResult = await pool.query(
      `SELECT categories
       FROM freelancer_profiles
       WHERE user_id = $1`,
      [freelancerId]
    );

    const categories = profileResult.rows[0]?.categories || [];

    // Si el freelancer no tiene categorías, no hay nada relevante que mostrar
    if (!categories.length) {
      return res.json([]);
    }

    // 2) Obtenemos las requests públicas que matchean con esas categorías
    const { rows } = await pool.query(
      `SELECT 
         r.*,
         u.username AS client_username,
         u.profile_picture AS client_pfp
       FROM requests r
       JOIN users u ON r.client_id = u.id
       WHERE r.category = ANY($1::text[])
       ORDER BY r.created_at DESC`,
      [categories]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener custom requests para freelancer:", err);
    res.status(500).json({ error: "Error al obtener custom requests" });
  }
};

// 🔹 Custom requests creadas por el cliente autenticado
exports.getRequestsByClient = async (req, res) => {
  const clientId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * 
       FROM requests 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener solicitudes del cliente:", err);
    res.status(500).json({ error: "Error al obtener tus solicitudes" });
  }
};
