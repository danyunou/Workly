const pool = require("../config/db");

exports.createUserReview = async (req, res) => {
  const reviewerId = req.user?.id;
  const { project_id, target_id, rating, comment } = req.body;

  if (!reviewerId) return res.status(401).json({ error: "No autorizado" });

  if (!project_id || !target_id || !rating) {
    return res.status(400).json({ error: "project_id, target_id y rating son requeridos" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating debe ser 1-5" });
  }

  try {
    // 1. Validar que el reviewer pertenece al proyecto
    const projectRes = await pool.query(
      `
      SELECT client_id, freelancer_id
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

    // Reviewer debe ser o el cliente o el freelancer
    if (project.client_id !== reviewerId && project.freelancer_id !== reviewerId) {
      return res.status(403).json({ error: "No participaste en este proyecto" });
    }

    // Target debe ser la contraparte
    if (![project.client_id, project.freelancer_id].includes(target_id)) {
      return res.status(400).json({ error: "El target no pertenece al proyecto" });
    }

    // Reviewer no puede calificar a sí mismo
    if (target_id === reviewerId) {
      return res.status(400).json({ error: "No puedes calificarte a ti mismo" });
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
      return res.status(400).json({ error: "Ya dejaste una reseña en este proyecto" });
    }

    // 3. Insertar la nueva review
    await pool.query(
      `
      INSERT INTO project_reviews (project_id, reviewer_id, target_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [project_id, reviewerId, target_id, rating, comment || null]
    );

    res.json({ message: "Review creada correctamente" });
  } catch (err) {
    console.error("Error en createUserReview:", err);
    res.status(500).json({ error: "Error interno al crear review" });
  }
};

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