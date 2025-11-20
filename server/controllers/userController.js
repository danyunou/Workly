const pool = require('../config/db');
const { uploadToS3 } = require("../services/uploadService");

exports.getUserProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    const result = await pool.query(
      `SELECT 
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

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener el perfil del usuario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};



exports.updateUserProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "No autorizado" });

  try {
    // Paso 1: Obtener datos actuales del usuario
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
    // 1. Obtener datos básicos del usuario
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        full_name,
        username,
        profile_picture,
        biography,
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

    // 2. Obtener estadísticas de reviews
    const reviews = await pool.query(
      `
      SELECT 
        COUNT(*)::int AS review_count,
        AVG(rating)::numeric(10,2) AS avg_rating
      FROM service_reviews
      WHERE target_id = $1
      `,
      [user.id]
    );

    const stats = reviews.rows[0];

    return res.json({
      full_name: user.full_name,
      username: user.username,
      avatar_url: user.profile_picture,
      bio: user.biography,
      member_since: user.created_at,
      avg_rating: stats.avg_rating || null,   // ⭐ promedio real
      reviews_count: stats.review_count || 0  // 📝 total de reviews
    });

  } catch (err) {
    console.error("Error en getPublicUserProfile:", err);
    return res
      .status(500)
      .json({ error: "Error obteniendo perfil público" });
  }
};
