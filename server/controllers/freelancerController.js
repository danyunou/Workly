// server/controllers/freelancerController.js
const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');

// ==========================
// Crear perfil de freelancer
// ==========================
exports.createFreelancerProfile = async (req, res) => {
  const {
    alias,
    description,
    languages,
    categories,
    skills,
    education,
    website,
    social_links
  } = req.body;

  const user_id = req.user?.id;

  try {
    // Validar archivos obligatorios
    if (!req.files?.profile_picture || !req.files.profile_picture[0]) {
      return res
        .status(400)
        .json({ error: "La foto de perfil (profile_picture) es obligatoria." });
    }

    if (!req.files?.verification_file || !req.files.verification_file[0]) {
      return res
        .status(400)
        .json({ error: "El archivo de verificación es obligatorio." });
    }

    const profileUrl = await uploadToS3(req.files.profile_picture[0]);
    const idFileUrl = await uploadToS3(req.files.verification_file[0]);

    await pool.query(
      `
      INSERT INTO freelancer_profiles 
        (user_id, alias, description, languages, categories, skills, education, website, social_links, profile_picture, verified)
      VALUES 
        ($1,     $2,    $3,          $4,        $5,         $6,    $7,        $8,      $9,           $10,           FALSE)
    `,
      [
        user_id,
        alias,
        description,
        languages ? languages.split(',').map(s => s.trim()) : [],
        categories ? categories.split(',').map(s => s.trim()) : [],
        skills ? skills.split(',').map(s => s.trim()) : [],
        education,
        website,
        social_links ? social_links.split(',').map(s => s.trim()) : [],
        profileUrl
      ]
    );

    await pool.query(
      `
      INSERT INTO verifications (user_id, file_url, status)
      VALUES ($1, $2, 'pending')
    `,
      [user_id, idFileUrl]
    );

    res.json({ message: 'Freelancer profile created and verification submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating profile' });
  }
};

// ===================================
// Actualizar datos del perfil (JSON)
// ===================================
exports.updateFreelancerProfile = async (req, res) => {
  const userId = req.user.id;
  let {
    description,
    languages,
    categories,
    skills,
    education,
    website,
    social_links,
    communication_hours // se guarda en tabla users
  } = req.body;

  try {
    // 🔹 Normalizar education: puede venir como string JSON o como array
    let parsedEducation = [];

    if (Array.isArray(education)) {
      parsedEducation = education;
    } else if (typeof education === "string") {
      const trimmed = education.trim();
      if (trimmed) {
        try {
          parsedEducation = JSON.parse(trimmed);
        } catch (e) {
          console.warn("❗ No pude parsear education, valor bruto:", education);
          parsedEducation = [];
        }
      }
    } else if (education && typeof education === "object") {
      parsedEducation = education;
    }

    // 1. Actualizar freelancer_profiles (sin tocar imagen)
    await pool.query(
      `UPDATE freelancer_profiles 
       SET
         description   = $1,
         languages     = $2,
         categories    = $3,
         skills        = $4,
         education     = $5,
         website       = $6,
         social_links  = $7
       WHERE user_id = $8`,
      [
        description,
        languages,
        categories,
        skills,
        parsedEducation,
        website,
        social_links,
        userId
      ]
    );

    // 2. Actualizar comunicación en tabla users (preferences.communication_hours)
    await pool.query(
      `UPDATE users 
       SET preferences = jsonb_set(
         COALESCE(preferences, '{}'::jsonb),
         '{communication_hours}',
         to_jsonb($1::text),
         true
       )
       WHERE id = $2`,
      [communication_hours, userId]
    );

    res.status(200).json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error("Error al actualizar perfil freelancer:", err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

exports.updateFreelancerAvatar = async (req, res) => {
  const userId = req.user.id;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ninguna imagen." });
    }

    const profileUrl = await uploadToS3(req.file);

    await pool.query(
      `UPDATE users
       SET profile_picture = $1
       WHERE id = $2`,
      [profileUrl, userId]
    );

    res.status(200).json({
      message: "Foto de perfil actualizada correctamente",
      profile_picture: profileUrl
    });
  } catch (err) {
    console.error("Error al actualizar foto de perfil:", err);
    res.status(500).json({ error: "Error al actualizar la foto de perfil" });
  }
};
