const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');

// Crear perfil de freelancer
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

// Obtener estado de verificación
exports.getVerificationStatus = async (req, res) => {
  const user_id = req.user?.id;

  try {
    const result = await pool.query(
      `SELECT status FROM verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'not_submitted' });
    }

    res.json({ status: result.rows[0].status });
  } catch (err) {
    console.error('Error checking verification status:', err);
    res.status(500).json({ error: 'Error checking verification status' });
  }
};

// (Opcional) Obtener detalles del perfil
exports.getFreelancerProfile = async (req, res) => {
  const user_id = req.user?.id;

  try {
    const result = await pool.query(`
      SELECT alias, description, languages, skills, education, website, social_links, profile_picture, verified
      FROM freelancer_profiles
      WHERE user_id = $1
    `, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching freelancer profile:', err);
    res.status(500).json({ error: 'Error fetching freelancer profile' });
  }
};
