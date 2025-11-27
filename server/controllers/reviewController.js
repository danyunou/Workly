// server/controllers/reviewController.js (o como lo tengas nombrado)
const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

// 🔹 Crear o actualizar review desde el flujo "genérico" (body con project_id / target_id)
exports.createUserReview = async (req, res) => {
  const reviewerId = req.user?.id;
  const { project_id, target_id, rating, comment } = req.body;

  if (!reviewerId) return res.status(401).json({ error: "No autorizado" });

  if (!project_id || !target_id || !rating) {
    return res
      .status(400)
      .json({ error: "project_id, target_id y rating son requeridos" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating debe ser 1-5" });
  }

  try {
    // 1. Validar que el reviewer pertenece al proyecto y que el proyecto está completado
    const projectRes = await pool.query(
      `
      SELECT id, client_id, freelancer_id, status
      FROM projects
      WHERE id = $1
      LIMIT 1
      `,
      [project_id]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const project = projectRes.rows[0];

    // Sólo permitir calificar proyectos completados
    if (project.status !== "completed") {
      return res
        .status(409)
        .json({ error: "Sólo puedes dejar una reseña cuando el proyecto está completado." });
    }

    // Reviewer debe ser o el cliente o el freelancer
    if (
      project.client_id !== reviewerId &&
      project.freelancer_id !== reviewerId
    ) {
      return res
        .status(403)
        .json({ error: "No participaste en este proyecto" });
    }

    // Target debe ser la contraparte
    if (
      ![project.client_id, project.freelancer_id].includes(target_id)
    ) {
      return res
        .status(400)
        .json({ error: "El target no pertenece al proyecto" });
    }

    // Reviewer no puede calificar a sí mismo
    if (target_id === reviewerId) {
      return res
        .status(400)
        .json({ error: "No puedes calificarte a ti mismo" });
    }

    // 2. Revisar si YA existe una review para este project+reviewer
    const existsRes = await pool.query(
      `
      SELECT id
      FROM project_reviews
      WHERE project_id = $1 AND reviewer_id = $2
      `,
      [project_id, reviewerId]
    );

    if (existsRes.rows.length > 0) {
      // 🔁 Si ya existe, actualizarla
      const reviewId = existsRes.rows[0].id;
      await pool.query(
        `
        UPDATE project_reviews
        SET rating = $1,
            comment = $2,
            target_id = $3
        WHERE id = $4
        `,
        [rating, comment || null, target_id, reviewId]
      );
    } else {
      // 3. Insertar la nueva review
      await pool.query(
        `
        INSERT INTO project_reviews (project_id, reviewer_id, target_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [project_id, reviewerId, target_id, rating, comment || null]
      );
    }

    // (Opcional) Notificación a la contraparte
    try {
      await createNotificationForUser(
        target_id,
        "Has recibido una nueva reseña en un proyecto.",
        "info",
        `/profile/${target_id}`
      );
    } catch (notifyErr) {
      console.error("Error creando notificación de review:", notifyErr);
    }

    res.json({ message: "Review registrada correctamente" });
  } catch (err) {
    console.error("Error en createUserReview:", err);
    res.status(500).json({ error: "Error interno al crear review" });
  }
};

// 🔹 ENDPOINTS pensados por proyecto (para usar en ProjectDetail)
// GET /api/projects/:projectId/reviews
exports.getProjectReviews = async (req, res) => {
  const { projectId } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        pr.id,
        pr.project_id,
        pr.reviewer_id,
        pr.target_id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u1.full_name AS reviewer_name,
        u2.full_name AS target_name
      FROM project_reviews pr
      LEFT JOIN users u1 ON u1.id = pr.reviewer_id
      LEFT JOIN users u2 ON u2.id = pr.target_id
      WHERE pr.project_id = $1
      ORDER BY pr.created_at ASC
      `,
      [projectId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener reviews de proyecto:", err);
    res.status(500).json({ error: "Error al obtener reviews del proyecto" });
  }
};

exports.createProjectReview = async (req, res) => {
  const reviewerId = req.user?.id;
  const { projectId } = req.params;
  const { rating, comment } = req.body;

  if (!reviewerId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (!rating) {
    return res.status(400).json({ error: "rating es requerido" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating debe ser 1-5" });
  }

  try {
    // 1. Validar proyecto, participantes y que esté completado
    const projectRes = await pool.query(
      `
      SELECT id, client_id, freelancer_id, status
      FROM projects
      WHERE id = $1
      LIMIT 1
      `,
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const project = projectRes.rows[0];

    if (project.status !== "completed") {
      return res
        .status(409)
        .json({ error: "Sólo se puede calificar cuando el proyecto está completado." });
    }

    if (
      project.client_id !== reviewerId &&
      project.freelancer_id !== reviewerId
    ) {
      return res
        .status(403)
        .json({ error: "No participaste en este proyecto" });
    }

    const targetId =
      reviewerId === project.client_id
        ? project.freelancer_id
        : project.client_id;

    // 2. Verificar si YA existe reseña de este usuario en este proyecto
    const existsRes = await pool.query(
      `
      SELECT id
      FROM project_reviews
      WHERE project_id = $1 AND reviewer_id = $2
      `,
      [projectId, reviewerId]
    );

    if (existsRes.rows.length > 0) {
      return res.status(409).json({
        error: "Ya registraste una reseña para este proyecto. No se puede modificar."
      });
    }

    // 3. Insertar nueva reseña
    await pool.query(
      `
      INSERT INTO project_reviews (project_id, reviewer_id, target_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [projectId, reviewerId, targetId, rating, comment || null]
    );

    // 4. Notificación para la contraparte (opcional)
    try {
      await createNotificationForUser(
        targetId,
        "Has recibido una nueva reseña en un proyecto.",
        "info",
        `/profile/${targetId}`
      );
    } catch (notifyErr) {
      console.error("Error creando notificación de review:", notifyErr);
    }

    // 5. Devolver lista actualizada de reseñas del proyecto
    const { rows } = await pool.query(
      `
      SELECT 
        pr.id,
        pr.project_id,
        pr.reviewer_id,
        pr.target_id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u1.full_name AS reviewer_name,
        u2.full_name AS target_name
      FROM project_reviews pr
      LEFT JOIN users u1 ON u1.id = pr.reviewer_id
      LEFT JOIN users u2 ON u2.id = pr.target_id
      WHERE pr.project_id = $1
      ORDER BY pr.created_at ASC
      `,
      [projectId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error en createProjectReview:", err);
    res.status(500).json({ error: "Error interno al guardar review" });
  }
};


// 🔹 Reviews para mostrar en el perfil de un usuario (target_id)
exports.getReviewsForUser = async (req, res) => {
  const { userId } = req.params; // target_id

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        pr.id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u.username AS reviewer_username,
        u.profile_picture AS reviewer_pfp
      FROM project_reviews pr
      LEFT JOIN users u ON u.id = pr.reviewer_id
      WHERE pr.target_id = $1
      ORDER BY pr.created_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error getReviewsForUser:", err);
    res.status(500).json({ error: "Error obteniendo reviews" });
  }
};

// 🔹 Stats rápidas para un usuario (para tarjeta de perfil, etc.)
exports.getUserReviewStats = async (userId) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        COUNT(*)::int AS review_count,
        AVG(rating)::numeric(10,2) AS avg_rating
      FROM project_reviews
      WHERE target_id = $1
      `,
      [userId]
    );

    return rows[0];
  } catch (err) {
    console.error("Error en getUserReviewStats:", err);
    return { review_count: 0, avg_rating: null };
  }
};
