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
    // 1) Categorías del freelancer (freelancer_profiles.categories TEXT[])
    const profileRes = await pool.query(
      `SELECT categories
       FROM freelancer_profiles
       WHERE user_id = $1`,
      [freelancerId]
    );

    const categories = profileRes.rows[0]?.categories || [];

    if (!categories.length) {
      // si el freelancer no tiene categorías configuradas, no hay nada que sugerir
      return res.json([]);
    }

    // 2) Traer service_requests + datos del cliente + datos del servicio
    const { rows } = await pool.query(
      `
      SELECT
        sr.*,
        u.username AS client_username,
        u.profile_picture AS client_pfp,
        s.title      AS service_title,
        s.category   AS service_category
      FROM service_requests sr
      JOIN users u ON u.id = sr.client_id
      LEFT JOIN services s ON s.id = sr.service_id
      WHERE
        (
          -- solicitudes ligadas a un servicio: filtrar por categoría del servicio
          (s.category IS NOT NULL AND s.category = ANY($1::text[]))
          -- solicitudes "custom" (service_id NULL): hoy no tienen categoría en DB,
          -- así que de momento se muestran a todos los freelancers
          OR sr.service_id IS NULL
        )
      ORDER BY sr.created_at DESC
      `,
      [categories]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error al obtener solicitudes para freelancer:", err);
    return res.status(500).json({ error: "Error al obtener solicitudes para freelancer" });
  }
};

// 🔹 Solicitudes creadas por el cliente autenticado (para MyRequests del cliente)
exports.getRequestsByClient = async (req, res) => {
  const clientId = req.user.id;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM service_requests
      WHERE client_id = $1
      ORDER BY created_at DESC
      `,
      [clientId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error al obtener solicitudes del cliente:", err);
    return res.status(500).json({ error: "Error al obtener tus solicitudes" });
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
