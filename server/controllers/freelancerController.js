const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');

exports.createFreelancerProfile = async (req, res) => {
  const {
    full_name,
    alias,
    description,
    languages,
    categories,
    skills,
    education,
    website,
    social_links
  } = req.body;

  const user_id = req.user?.id || 1; // reemplaza con autenticación real

  try {
    const profileUrl = await uploadToS3(req.files.profile_picture[0]);
    const idFileUrl = await uploadToS3(req.files.verification_file[0]);

    await pool.query(`
      INSERT INTO freelancer_profiles 
        (user_id, alias, description, languages, skills, education, website, social_links, profile_picture, verified)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
    `, [
      user_id,
      alias,
      description,
      languages.split(',').map(s => s.trim()),
      skills.split(',').map(s => s.trim()),
      education,
      website,
      social_links.split(',').map(s => s.trim()),
      profileUrl
    ]);

    await pool.query(`
      INSERT INTO verifications (user_id, file_url, status)
      VALUES ($1, $2, 'pending')
    `, [user_id, idFileUrl]);

    res.json({ message: 'Freelancer profile created and verification submitted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating profile' });
  }
};

exports.getVerificationStatus = async (req, res) => {
  const user_id = req.user?.id;

  if (!user_id) return res.status(401).json({ error: "No autorizado" });

  try {
    // Verificar si ya existe un perfil de freelancer
    const freelancerResult = await pool.query(
      `SELECT verified FROM freelancer_profiles WHERE user_id = $1 LIMIT 1`,
      [user_id]
    );

    if (freelancerResult.rows.length === 0) {
      return res.json({ status: "not_submitted" });
    }

    const verified = freelancerResult.rows[0].verified;

    // Verificar si hay solicitud de verificación
    const verificationResult = await pool.query(
      `SELECT status FROM verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (verificationResult.rows.length === 0) {
      return res.json({ status: verified ? "verified" : "not_submitted" });
    }

    const status = verificationResult.rows[0].status;

    return res.json({ status }); // puede ser 'pending', 'approved', 'rejected'
  } catch (err) {
    console.error("Error checking verification status:", err);
    return res.status(500).json({ error: "Error checking verification status" });
  }
};

exports.getFreelancerProfile = async (req, res) => {
  const user_id = req.user?.id;

  if (!user_id) return res.status(401).json({ error: "No autorizado" });

  try {
    const result = await pool.query(`
      SELECT alias, description, languages, skills, education, website, social_links, profile_picture, verified
      FROM freelancer_profiles
      WHERE user_id = $1
    `, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perfil de freelancer no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener perfil de freelancer:", err);
    res.status(500).json({ error: "Error al obtener el perfil" });
  }
};
