// server/controllers/serviceController.js
const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');
const { createNotificationForUser } = require("./notificationController");

// ================== OBTENER TODOS LOS SERVICIOS (PÚBLICO) ==================
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
            'delivery_time_days', s.delivery_time_days,
            'rating_avg', s.rating_avg,
            'rating_count', s.rating_count,
            'completed_orders', s.completed_orders,
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
      AND s.is_deleted = FALSE
      GROUP BY s.category
      ORDER BY s.category;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener servicios:", err.message);
    res.status(500).json({ error: "Error al obtener servicios", detail: err.message });
  }
};

// ================== CREAR SERVICIO ==================
exports.createService = async (req, res) => {
  const { title, description, price, category, delivery_time_days } = req.body;
  const freelancer_id = req.user?.id;

  try {
    if (!freelancer_id) {
      return res.status(401).json({ error: "No autenticado." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "El título es obligatorio." });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "La descripción es obligatoria." });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: "La categoría es obligatoria." });
    }

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      return res.status(400).json({ error: "El precio debe ser mayor a 0." });
    }

    if (!req.files || !req.files.image || !req.files.image[0]) {
      return res.status(400).json({ error: "Falta la imagen del servicio." });
    }

    const imageFile = req.files.image[0];
    const imageUrl = await uploadToS3(imageFile);

    const deliveryTime = delivery_time_days
      ? parseInt(delivery_time_days, 10)
      : 7;

    if (Number.isNaN(deliveryTime) || deliveryTime <= 0) {
      return res.status(400).json({
        error: "El tiempo de entrega debe ser un número mayor a 0.",
      });
    }

    const result = await pool.query(
      `INSERT INTO services (
         title,
         description,
         price,
         freelancer_id,
         category,
         image_url,
         created_at,
         is_active,
         delivery_time_days
       )
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, TRUE, $7)
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        numericPrice,
        freelancer_id,
        category.trim(),
        imageUrl,
        deliveryTime,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error al crear el servicio:", err.message);
    res.status(500).json({ error: "Error al crear el servicio." });
  }
};

// ================== SERVICIOS POR CATEGORÍA (PÚBLICO) ==================
exports.getServicesByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.title,
        s.price,
        s.image_url,
        s.delivery_time_days,
        s.rating_avg,
        s.rating_count,
        s.completed_orders,
        COALESCE(fp.alias, u.username) AS user_alias,
        u.username AS username,
        u.profile_picture
      FROM services s
      JOIN users u ON u.id = s.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = s.freelancer_id
      WHERE s.category = $1 AND s.is_active = TRUE  AND s.is_deleted = FALSE
      ORDER BY s.created_at DESC
    `,
      [category]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al filtrar servicios por categoría:", err.message);
    res.status(500).json({ error: "Error al filtrar servicios por categoría" });
  }
};

// ================== SERVICIOS POR FREELANCER (DASHBOARD) ==================
exports.getServicesByFreelancer = async (req, res) => {
  const freelancerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
         id,
         title,
         description,
         category,
         price,
         image_url,
         created_at,
         is_active,
         delivery_time_days,
         rating_avg,
         rating_count,
         completed_orders
       FROM services
       WHERE freelancer_id = $1
         AND is_deleted = FALSE
       ORDER BY created_at DESC`,
      [freelancerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener servicios del freelancer:", err);
    res.status(500).json({ error: "Error al obtener tus servicios" });
  }
};

// ================== ELIMINAR SERVICIO (SOFT DELETE) ==================
exports.deleteService = async (req, res) => {
  const serviceId = req.params.id;
  const userId = req.user?.id;

  try {
    const check = await pool.query(
      `SELECT * FROM services 
       WHERE id = $1 AND freelancer_id = $2 AND is_deleted = FALSE`,
      [serviceId, userId]
    );

    if (check.rowCount === 0) {
      return res
        .status(403)
        .json({ error: "Unauthorized, service not found, or already deleted." });
    }

    const result = await pool.query(
      `UPDATE services
       SET 
         is_deleted = TRUE,
         is_active  = FALSE,
         deleted_at = NOW()
       WHERE id = $1 AND freelancer_id = $2
       RETURNING *`,
      [serviceId, userId]
    );

    res.json({
      message: "Service archived (soft delete) successfully.",
      service: result.rows[0],
    });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ================== ACTUALIZAR SERVICIO (EDITAR) ==================
exports.updateService = async (req, res) => {
  const serviceId = req.params.id;
  const freelancerId = req.user.id;

  try {
    // 1) Obtener datos actuales del servicio
    const existing = await pool.query(
      `SELECT * FROM services 
       WHERE id = $1 AND freelancer_id = $2 AND is_deleted = false`,
      [serviceId, freelancerId]
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Service not found or unauthorized." });
    }

    const current = existing.rows[0];

    // 2) Leer datos enviados (FormData + multer)
    let { title, description, category, price, delivery_time_days } = req.body;

    // 3) Conservar valores existentes si no vienen en req.body
    const newTitle = title?.trim() || current.title;
    const newDescription = description?.trim() || current.description;
    const newCategory = category || current.category;

    const newPrice =
      price !== undefined && price !== null && price !== ""
        ? Number(price)
        : Number(current.price);

    const newDeliveryDays =
      delivery_time_days !== undefined &&
      delivery_time_days !== null &&
      delivery_time_days !== ""
        ? Number(delivery_time_days)
        : current.delivery_time_days;

    // 4) Validaciones
    if (!newTitle) {
      return res.status(400).json({ error: "El título es obligatorio." });
    }
    if (!newDescription) {
      return res
        .status(400)
        .json({ error: "La descripción es obligatoria." });
    }
    if (!newCategory) {
      return res.status(400).json({ error: "La categoría es obligatoria." });
    }
    if (Number.isNaN(newPrice) || newPrice <= 0) {
      return res
        .status(400)
        .json({ error: "El precio debe ser mayor a 0." });
    }
    if (Number.isNaN(newDeliveryDays) || newDeliveryDays <= 0) {
      return res.status(400).json({
        error: "El tiempo de entrega debe ser mayor a 0 días.",
      });
    }

    // 5) Imagen: si hay nueva, súbela a S3. Si no, conserva la actual
    let newImageUrl = current.image_url;
    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      newImageUrl = await uploadToS3(file);
    }

    // 6) Hacer el UPDATE seguro (incluyendo delivery_time_days)
    const updated = await pool.query(
      `
      UPDATE services
      SET
        title = $1,
        description = $2,
        category = $3,
        price = $4,
        delivery_time_days = $5,
        image_url = $6
      WHERE id = $7 AND freelancer_id = $8
      RETURNING *
      `,
      [
        newTitle,
        newDescription,
        newCategory,
        newPrice,
        newDeliveryDays,
        newImageUrl,
        serviceId,
        freelancerId,
      ]
    );

    return res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating service:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ================== SOLICITUDES DE UN SERVICIO ==================
exports.getRequestsForService = async (req, res) => {
  const serviceId = req.params.id;
  const freelancerId = req.user.id;

  try {
    const { rows: serviceRows } = await pool.query(
      "SELECT * FROM services WHERE id = $1 AND freelancer_id = $2",
      [serviceId, freelancerId]
    );

    if (serviceRows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or service not found" });
    }

    const { rows: requests } = await pool.query(
      `SELECT 
        sr.id, 
        sr.message, 
        sr.proposed_budget, 
        sr.created_at, 
        sr.proposed_deadline,
        sr.status,
        u.username AS client_name
      FROM service_requests sr
      JOIN users u ON sr.client_id = u.id
      WHERE sr.service_id = $1
      ORDER BY sr.created_at DESC`,
      [serviceId]
    );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests for service:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ================== ACEPTAR SOLICITUD (CREA PROYECTO) ==================
exports.acceptServiceRequest = async (req, res) => {
  const { requestId } = req.params;
  const freelancerId = req.user?.id;

  try {
    const { rows } = await pool.query(
      `SELECT sr.*, s.freelancer_id, s.id AS service_id
       FROM service_requests sr
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

    await pool.query(
      `UPDATE service_requests
       SET status = 'accepted'
       WHERE id = $1`,
      [requestId]
    );

    const { rows: projectRows } = await pool.query(
      `INSERT INTO projects (
        service_request_id,
        service_id,
        client_id,
        freelancer_id,
        status,
        started_at,
        created_at,
        payment_status,
        client_accepted,
        freelancer_accepted
      )
      VALUES ($1, $2, $3, $4, 'pending_contract', NOW(), NOW(), 'pending', FALSE, FALSE)
      RETURNING *`,
      [
        request.id,
        request.service_id,
        request.client_id,
        request.freelancer_id
      ]
    );

    const project = projectRows[0];

    res.status(200).json({
      message: "Solicitud aceptada y proyecto creado.",
      project
    });
  } catch (err) {
    console.error("Error al aceptar solicitud:", err);
    res.status(500).json({ error: "Error interno al aceptar la solicitud." });
  }
};

// ================== CLIENTE SOLICITA SERVICIO ==================
exports.hireService = async (req, res) => {
  const clientId = req.user.id;
  const { serviceId } = req.params;
  const { message, proposed_deadline, proposed_budget } = req.body;

  try {
    // 1) Verificar que el servicio exista y esté activo
    const { rows: serviceRows } = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND is_active = TRUE`,
      [serviceId]
    );

    if (serviceRows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const service = serviceRows[0];

    // 2) Verificar si YA hay una solicitud pendiente o rechazada
    //    de este cliente para ESTE MISMO servicio.
    //    Estas se deben gestionar / reenviar desde "Mis solicitudes".
    const { rows: existingRequests } = await pool.query(
      `
      SELECT id, status
      FROM service_requests
      WHERE service_id = $1
        AND client_id = $2
        AND status IN ('pending_freelancer', 'rejected')
      `,
      [service.id, clientId]
    );

    if (existingRequests.length > 0) {
      return res.status(409).json({
        error:
          "Ya tienes una solicitud pendiente o rechazada para este servicio. Podrás gestionarla y reenviarla desde 'Mis solicitudes'.",
      });
    }

    // 3) Crear la nueva solicitud
    const { rows: srRows } = await pool.query(
      `INSERT INTO service_requests (
        service_id,
        client_id,
        message,
        proposed_deadline,
        proposed_budget,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'pending_freelancer', NOW())
      RETURNING *`,
      [
        service.id,
        clientId,
        message || null,
        proposed_deadline || null,
        proposed_budget || null,
      ]
    );

    const serviceRequest = srRows[0];

    return res.status(201).json({
      message:
        "Solicitud enviada al freelancer. Podrás gestionarla desde 'Mis solicitudes'.",
      service_request: serviceRequest,
    });
  } catch (err) {
    console.error("Error al solicitar servicio:", err);

    // Red de seguridad por si el índice unique_active_service_request
    // también considera 'rejected' o algún otro estado como activo.
    if (err.code === "23505" && err.constraint === "unique_active_service_request") {
      return res.status(409).json({
        error:
          "Ya tienes una solicitud activa para este servicio. Podrás gestionarla o reenviarla desde 'Mis solicitudes'.",
      });
    }

    return res
      .status(500)
      .json({ error: "Error interno al solicitar el servicio" });
  }
};

// ================== OBTENER SERVICIO POR ID (PÚBLICO) ==================
exports.getServiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND is_deleted = FALSE`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener el servicio por ID:", err.message);
    res.status(500).json({ error: "Error interno al obtener el servicio" });
  }
};

// ================== RESEÑAS ==================
exports.createServiceReview = async (req, res) => {
  const clientId = req.user.id;
  const { id: serviceId } = req.params;
  const { rating, comment } = req.body;

  try {
    const numericRating = parseInt(rating, 10);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "La calificación debe ser un número entre 1 y 5." });
    }

    const eligibleRes = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM projects p
      LEFT JOIN service_requests sr ON sr.id = p.service_request_id
      WHERE p.client_id = $1
        AND p.status = 'completed'
        AND COALESCE(p.service_id, sr.service_id) = $2
      `,
      [clientId, serviceId]
    );

    const hasCompleted = parseInt(eligibleRes.rows[0].count, 10) > 0;

    if (!hasCompleted) {
      return res.status(400).json({
        error: "Solo puedes reseñar servicios en los que hayas completado un proyecto."
      });
    }

    const existingRes = await pool.query(
      `
      SELECT 1
      FROM service_reviews
      WHERE service_id = $1 AND client_id = $2
      LIMIT 1
      `,
      [serviceId, clientId]
    );

    if (existingRes.rows.length > 0) {
      return res.status(400).json({
        error: "Ya has dejado una reseña para este servicio."
      });
    }

    await pool.query(
      `
      INSERT INTO service_reviews (service_id, client_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      `,
      [serviceId, clientId, numericRating, comment || null]
    );

    const aggRes = await pool.query(
      `
      SELECT
        COALESCE(AVG(rating), 0)::NUMERIC(3,2) AS avg_rating,
        COUNT(*) AS review_count
      FROM service_reviews
      WHERE service_id = $1
      `,
      [serviceId]
    );

    const avgRating = aggRes.rows[0].avg_rating;
    const reviewCount = parseInt(aggRes.rows[0].review_count, 10);

    await pool.query(
      `
      UPDATE services
      SET rating_avg = $1,
          rating_count = $2
      WHERE id = $3
      `,
      [avgRating, reviewCount, serviceId]
    );

    res.status(201).json({
      message: "Reseña guardada correctamente.",
      rating_avg: avgRating,
      rating_count: reviewCount
    });
  } catch (err) {
    console.error("Error al crear reseña:", err);
    res.status(500).json({ error: "Error interno al crear reseña." });
  }
};

exports.getServiceReviews = async (req, res) => {
  const { id: serviceId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.username AS client_username,
        u.full_name AS client_name
      FROM service_reviews r
      JOIN users u ON u.id = r.client_id
      WHERE r.service_id = $1
      ORDER BY r.created_at DESC
      `,
      [serviceId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener reseñas del servicio:", err);
    res.status(500).json({ error: "Error interno al obtener reseñas." });
  }
};

// ================== ACTIVAR / PAUSAR SERVICIO ==================
exports.setServiceActiveState = async (req, res) => {
  const serviceId = req.params.id;
  const freelancerId = req.user.id;
  const { is_active } = req.body;

  try {
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active debe ser booleano." });
    }

    const result = await pool.query(
      `UPDATE services
       SET is_active = $1
       WHERE id = $2 
         AND freelancer_id = $3
         AND is_deleted = FALSE
       RETURNING *`,
      [is_active, serviceId, freelancerId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Servicio no encontrado, no autorizado o eliminado." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar estado del servicio:", err);
    res.status(500).json({ error: "Error interno al cambiar estado." });
  }
};
