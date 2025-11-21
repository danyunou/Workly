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
    // 1. Obtener categorías del freelancer
    const profileRes = await pool.query(
      `SELECT categories 
       FROM freelancer_profiles
       WHERE user_id = $1`,
      [freelancerId]
    );

    const freelancerCategories = profileRes.rows[0]?.categories || [];

    if (!freelancerCategories.length) {
      return res.json([]); // sin categorías → no hay nada que mostrar
    }

    // 2. Solicitudes relevantes por categoría
    //    (Tanto las CUSTOM como las dirigidas a servicios están en esta tabla)
    const requestsRes = await pool.query(
      `
      SELECT 
        sr.*,
        u.username AS client_username,
        u.profile_picture AS client_pfp
      FROM service_requests sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.category = ANY($1::text[])
        AND sr.status IN ('pending_freelancer', 'pending_client', 'pending')
      ORDER BY sr.created_at DESC
      `,
      [freelancerCategories]
    );

    return res.json(requestsRes.rows);

  } catch (err) {
    console.error("Error al obtener solicitudes para freelancer:", err);
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
};


//
// 🔹 Obtener las solicitudes creadas por el cliente autenticado
//    (Todo sale de la misma tabla `service_requests`)
//
exports.getRequestsByClient = async (req, res) => {
  const clientId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT * 
      FROM service_requests
      WHERE client_id = $1
      ORDER BY created_at DESC
      `,
      [clientId]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("Error al obtener solicitudes del cliente:", err);
    res.status(500).json({ error: "Error al obtener solicitudes del cliente" });
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
