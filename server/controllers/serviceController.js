// server/controllers/serviceController.js
const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');


exports.getAllServices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.category,
        json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'price', s.price,
            'freelancer_id', s.freelancer_id,
            'image_url', s.image_url,
            'created_at', s.created_at,
            -- alias del freelancer (si no hay, usamos username)
            'user_alias', COALESCE(fp.alias, u.username),
            -- username real para armar la URL pública
            'username', u.username,
            -- foto de perfil del freelancer
            'profile_picture', u.profile_picture
          )
          ORDER BY s.created_at DESC
        ) AS services
      FROM services s
      JOIN users u ON u.id = s.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = s.freelancer_id
      WHERE s.is_active = TRUE
      GROUP BY s.category
      ORDER BY s.category;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener servicios:", err.message);
    res.status(500).json({ error: "Error al obtener servicios", detail: err.message });
  }
};




exports.createService = async (req, res) => {
  const { title, description, price, category } = req.body;
  const freelancer_id = req.user?.id;

  try {
    if (!req.files || !req.files.image || !req.files.image[0]) {
      return res.status(400).json({ error: "Falta la imagen del servicio." });
    }

    const imageFile = req.files.image[0];
    const imageUrl = await uploadToS3(imageFile);

    const result = await pool.query(
      `INSERT INTO services (title, description, price, freelancer_id, category, image_url, created_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, TRUE)
       RETURNING *`,
      [title, description, price, freelancer_id, category, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear el servicio:', err.message);
    res.status(500).json({ error: 'Error al crear el servicio.' });
  }
};


exports.getServicesByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.title,
        s.price,
        COALESCE(fp.alias, u.username) AS user_alias,
        u.username AS username,
        u.profile_picture,
        s.image_url
      FROM services s
      JOIN users u ON u.id = s.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = s.freelancer_id
      WHERE s.category = $1 AND s.is_active = TRUE
      ORDER BY s.created_at DESC
    `, [category]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error al filtrar servicios por categoría:', err.message);
    res.status(500).json({ error: 'Error al filtrar servicios por categoría' });
  }
};


exports.getServicesByFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM services WHERE freelancer_id = $1 ORDER BY created_at DESC`,
      [freelancerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener servicios del freelancer:", err);
    res.status(500).json({ error: "Error al obtener tus servicios" });
  }
};

exports.deleteService = async (req, res) => {
  const serviceId = req.params.id;
  const userId = req.user?.id;

  try {
    // Asegurarse que el servicio pertenezca al freelancer
    const check = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND freelancer_id = $2`,
      [serviceId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: "Unauthorized or service not found." });
    }

    await pool.query(`DELETE FROM services WHERE id = $1`, [serviceId]);

    res.json({ message: "Service deleted successfully." });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.updateService = async (req, res) => {
  const serviceId = req.params.id;
  const freelancerId = req.user.id;
  const { title, description, category, price } = req.body;

  try {
    const result = await pool.query(
      `UPDATE services SET title = $1, description = $2, category = $3, price = $4
       WHERE id = $5 AND freelancer_id = $6 RETURNING *`,
      [title, description, category, price, serviceId, freelancerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Service not found or unauthorized." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating service:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.getRequestsForService = async (req, res) => {
  const serviceId = req.params.id;
  const freelancerId = req.user.id;

  try {
    // Verificar si el servicio pertenece al freelancer autenticado
    const { rows: serviceRows } = await pool.query(
      "SELECT * FROM services WHERE id = $1 AND freelancer_id = $2",
      [serviceId, freelancerId]
    );

    if (serviceRows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or service not found" });
    }

    // Obtener solicitudes asociadas al servicio
    const { rows: requests } = await pool.query(
      `SELECT sr.id, sr.message, sr.proposed_budget, sr.created_at, u.username AS client_name
       FROM service_requests sr
       JOIN users u ON sr.client_id = u.id
       WHERE sr.service_id = $1`,
      [serviceId]
    );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests for service:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.acceptServiceRequest = async (req, res) => {
  const { requestId } = req.params;
  const freelancerId = req.user?.id;

  try {
    // Validar que la solicitud existe y pertenece a un servicio del freelancer
    const { rows } = await pool.query(
      `SELECT sr.*, s.freelancer_id FROM service_requests sr
       JOIN services s ON sr.service_id = s.id
       WHERE sr.id = $1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada." });
    }

    const request = rows[0];

    if (request.freelancer_id !== freelancerId) {
      return res.status(403).json({ error: "No autorizado para aceptar esta solicitud." });
    }

    // Actualizar estado de la solicitud
    await pool.query(`UPDATE service_requests SET status = 'accepted' WHERE id = $1`, [requestId]);

    // Crear proyecto asociado
    await pool.query(
      `INSERT INTO projects (service_request_id, status, started_at)
       VALUES ($1, 'pending_contract', NOW())`,
      [requestId]
    );

    res.status(200).json({ message: "Solicitud aceptada y proyecto creado." });
  } catch (err) {
    console.error("Error al aceptar solicitud:", err);
    res.status(500).json({ error: "Error interno al aceptar la solicitud." });
  }
};

exports.hireService = async (req, res) => {
  const clientId = req.user.id;
  const { serviceId } = req.params;

  try {
    // Validar que el servicio existe
    const { rows: serviceRows } = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND is_active = TRUE`,
      [serviceId]
    );

    if (serviceRows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const service = serviceRows[0];

    // Crear proyecto directamente
    const { rows: project } = await pool.query(
      `INSERT INTO projects (service_id, client_id, freelancer_id, status, started_at)
       VALUES ($1, $2, $3, 'pending_contract', NOW())
       RETURNING *`,
      [service.id, clientId, service.freelancer_id]
    );

    res.status(201).json({ message: "Servicio contratado exitosamente", project: project[0] });
  } catch (err) {
    console.error("Error al contratar servicio:", err);
    res.status(500).json({ error: "Error interno al contratar el servicio" });
  }
};

exports.getServiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM services WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener el servicio por ID:", err.message);
    res.status(500).json({ error: "Error interno al obtener el servicio" });
  }
};

