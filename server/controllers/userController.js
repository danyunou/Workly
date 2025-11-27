const pool = require('../config/db');
const { uploadToS3 } = require("../services/uploadService");
const { getUserReviewStats } = require("./reviewController");
const { createNotificationForUser } = require("./notificationController");

exports.getUserProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    const result = await pool.query(
      `SELECT 
         id,
         full_name,
         username,
         email,
         profile_picture,
         biography,
         preferences->>'usage_preference' AS usage_preference,
         preferences->>'communication_days' AS communication_days,
         preferences->>'communication_hours' AS communication_hours,
         created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // 🔹 Stats reales
    const stats = await getUserReviewStats(user.id);

    // 🔹 Reseñas recientes dirigidas a este usuario (cuando actúa como cliente)
    const { rows: recentReviews } = await pool.query(
      `
      SELECT
        pr.id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u.full_name AS reviewer_name,
        COALESCE(
          p.service_title,
          'Proyecto #' || pr.project_id::text
        ) AS project_title
      FROM project_reviews pr
      JOIN users u
        ON u.id = pr.reviewer_id
      JOIN projects p
        ON p.id = pr.project_id
      WHERE pr.target_id = $1
      ORDER BY pr.created_at DESC
      LIMIT 10
      `,
      [user.id]
    );

    res.json({
      ...user,
      avg_rating: stats.avg_rating,
      reviews_count: stats.review_count,
      recent_reviews: recentReviews,
    });
  } catch (err) {
    console.error("Error al obtener el perfil del usuario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


exports.updateUserProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    const { rows } = await pool.query(
      `SELECT biography, preferences, profile_picture FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const current = rows[0];
    const updatedBiography = req.body.biography ?? current.biography;

    const currentPrefs = current.preferences || {};
    const updatedPreferences = {
      usage_preference: req.body.usage_preference ?? currentPrefs.usage_preference ?? "",
      communication_hours: req.body.communication_pref ?? currentPrefs.communication_hours ?? ""
    };

    let profilePictureUrl = current.profile_picture;
    if (req.files?.profile_picture?.[0]) {
      profilePictureUrl = await uploadToS3(req.files.profile_picture[0]);
    }

    await pool.query(
      `UPDATE users
       SET biography = $1,
           preferences = $2,
           profile_picture = $3
       WHERE id = $4`,
      [
        updatedBiography,
        JSON.stringify(updatedPreferences),
        profilePictureUrl,
        userId
      ]
    );

    res.json({ message: "Perfil actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar el perfil:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.getPublicUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        full_name,
        username,
        profile_picture,
        biography,
        preferences->>'usage_preference' AS usage_preference,
        preferences->>'communication_hours' AS communication_hours,
        created_at
      FROM users
      WHERE username = $1
      LIMIT 1
      `,
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    // Obtener stats reales
    const stats = await getUserReviewStats(user.id);

    res.json({
      ...user,
      avg_rating: stats.avg_rating,
      reviews_count: stats.review_count
    });

  } catch (err) {
    console.error("Error en getPublicUserProfile:", err);
    return res
      .status(500)
      .json({ error: "Error obteniendo perfil público" });
  }
};
