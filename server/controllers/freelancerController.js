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

  const user_id = req.user?.id;

  try {
    if (!req.files?.profile_picture || !req.files?.verification_file) {
      return res.status(400).json({ error: "Archivos requeridos no enviados" });
    }

    const profileUrl = await uploadToS3(req.files.profile_picture[0]);
    const idFileUrl = await uploadToS3(req.files.verification_file[0]);

    console.log("💡 education recibido como string:", education);
    try {
      const parsed = JSON.parse(education);
      console.log("✅ parsed:", parsed);
    } catch (err) {
      console.error("❌ JSON inválido:", education);
      return res.status(400).json({ error: "Formato de educación no es JSON válido" });
    }

    // 🔧 Procesar categorías (aceptar string separado por comas)
    const parsedCategories =
      typeof categories === "string"
        ? categories.split(",").map(c => c.trim())
        : Array.isArray(categories)
        ? categories.map(c => c.trim())
        : [];

    console.log("📦 Categorías procesadas:", parsedCategories);

    // 🖼 Guardar la imagen de perfil en la tabla `users`
    await pool.query(
      `UPDATE users SET profile_picture = $1 WHERE id = $2`,
      [profileUrl, user_id]
    );

    // 💾 Guardar el perfil
    await pool.query(`
      INSERT INTO freelancer_profiles 
        (user_id, alias, description, languages, skills, education, website, social_links, categories, verified)
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
      parsedCategories
    ]);

    // 🧾 Guardar archivo de verificación
    await pool.query(`
      INSERT INTO verifications (user_id, file_url, status)
      VALUES ($1, $2, 'pending')
    `, [user_id, idFileUrl]);

    res.json({ message: 'Freelancer profile created and verification submitted' });

  } catch (err) {
    console.error("Error al crear perfil de freelancer:", err);
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
      `SELECT status, rejection_message FROM verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (verificationResult.rows.length === 0) {
      return res.json({ status: verified ? "verified" : "not_submitted" });
    }

    const { status, rejection_message } = verificationResult.rows[0];

    // Incluir el mensaje solo si está rechazado
    if (status === "rejected") {
      return res.json({ status, rejection_message });
    }

    return res.json({ status }); // puede ser 'pending' o 'approved'
  } catch (err) {
    console.error("Error checking verification status:", err);
    return res.status(500).json({ error: "Error checking verification status" });
  }
};


exports.getFreelancerProfile = async (req, res) => {
  const user_id = req.user?.id;

  if (!user_id) return res.status(401).json({ error: "No autorizado" });

  try {
    const result = await pool.query(
      `
      SELECT 
        u.full_name,
        u.username,
        u.created_at,
        u.preferences,
        u.profile_picture,
        f.alias,
        f.description,
        f.languages,
        f.skills,
        f.education,
        f.website,
        f.social_links,
        f.verified,
        f.categories,
        f.featured_projects             
      FROM freelancer_profiles f
      JOIN users u ON f.user_id = u.id
      WHERE f.user_id = $1
      `,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perfil de freelancer no encontrado" });
    }

    const profile = result.rows[0];

    // Arrays
    profile.languages = Array.isArray(profile.languages) ? profile.languages : [];
    profile.skills = Array.isArray(profile.skills) ? profile.skills : [];
    profile.social_links = Array.isArray(profile.social_links) ? profile.social_links : [];

    // Educación
    if (typeof profile.education === "string") {
      try {
        profile.education = JSON.parse(profile.education);
      } catch {
        profile.education = [];
      }
    }

    // Categorías
    profile.categories = Array.isArray(profile.categories)
      ? profile.categories.map(c => c.trim())
      : [];

    // Portafolio (JSONB ya llega como objeto; por si acaso, normalizamos)
    if (!profile.featured_projects) {
      profile.featured_projects = [];
    } else if (!Array.isArray(profile.featured_projects)) {
      // por si viniera como string
      try {
        profile.featured_projects = JSON.parse(profile.featured_projects);
      } catch {
        profile.featured_projects = [];
      }
    }

    res.json(profile);
  } catch (err) {
    console.error("Error al obtener perfil de freelancer:", err);
    res.status(500).json({ error: "Error al obtener el perfil" });
  }
};




// controllers/requestController.js
exports.getRequestsForFreelancer = async (req, res) => {
  const userId = req.user?.id;

  try {
    const catResult = await pool.query(
      `SELECT category_id FROM freelancer_categories WHERE user_id = $1`,
      [userId]
    );
    const categories = catResult.rows.map(row => row.category_id);

    if (categories.length === 0) return res.json([]);

    const result = await pool.query(`
      SELECT r.id, r.title, r.description, r.budget
      FROM requests r
      WHERE r.category_id = ANY($1::int[])
        AND r.status = 'active'
      ORDER BY r.created_at DESC
    `, [categories]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener solicitudes para freelancer:", err);
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
};

exports.updateFreelancerProfile = async (req, res) => {
  const userId = req.user.id;
  const {
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
    // 1. Actualizar freelancer_profiles
    await pool.query(
      `UPDATE freelancer_profiles 
       SET
         description = $1,
         languages = $2,
         categories = $3,
         skills = $4,
         education = $5,
         website = $6,
         social_links = $7
       WHERE user_id = $8`,
      [
        description,
        languages,
        categories,
        skills,
        education,
        website,
        social_links,
        userId
      ]
    );

    // 2. Actualizar comunicación en tabla users
    await pool.query(
      `UPDATE users 
      SET preferences = jsonb_set(preferences, '{communication_hours}', to_jsonb($1::text), true)
      WHERE id = $2`,
      [communication_hours, userId]
    );

    res.status(200).json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error("Error al actualizar perfil freelancer:", err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

exports.getPublicFreelancerProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        u.full_name,
        u.username,
        u.created_at,
        u.preferences,
        u.profile_picture,
        f.alias,
        f.description,
        f.languages,
        f.skills,
        f.education,
        f.website,
        f.social_links,
        f.verified,
        f.categories,
        f.featured_projects              
      FROM freelancer_profiles f
      JOIN users u ON f.user_id = u.id
      WHERE u.username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Perfil de freelancer no encontrado" });
    }

    const profile = result.rows[0];

    profile.languages = Array.isArray(profile.languages) ? profile.languages : [];
    profile.skills = Array.isArray(profile.skills) ? profile.skills : [];
    profile.social_links = Array.isArray(profile.social_links) ? profile.social_links : [];

    if (typeof profile.education === "string") {
      try {
        profile.education = JSON.parse(profile.education);
      } catch {
        profile.education = [];
      }
    }

    profile.categories = Array.isArray(profile.categories)
      ? profile.categories.map(c => c.trim())
      : [];

    if (!profile.featured_projects) {
      profile.featured_projects = [];
    } else if (!Array.isArray(profile.featured_projects)) {
      try {
        profile.featured_projects = JSON.parse(profile.featured_projects);
      } catch {
        profile.featured_projects = [];
      }
    }

    res.json(profile);
  } catch (err) {
    console.error("Error al obtener perfil público de freelancer:", err);
    res.status(500).json({ error: "Error al obtener el perfil público" });
  }
};


exports.updatePortfolio = async (req, res) => {
  const userId = req.user.id;
  let { featured_projects } = req.body;

  try {
    if (!featured_projects) featured_projects = [];

    if (!Array.isArray(featured_projects)) {
      return res
        .status(400)
        .json({ message: "featured_projects debe ser un arreglo" });
    }

    if (featured_projects.length > 5) {
      return res
        .status(400)
        .json({ message: "Máximo 5 proyectos en el portafolio." });
    }

    featured_projects = featured_projects.map((p) => ({
      title: String(p.title || "").trim().slice(0, 150),
      description: p.description ? String(p.description).trim() : null,
      link: p.link ? String(p.link).trim() : null,
      image_url: p.image_url ? String(p.image_url).trim() : null,
    }));

    await pool.query(
      `
      UPDATE freelancer_profiles
      SET featured_projects = $1::jsonb
      WHERE user_id = $2
    `,
      [JSON.stringify(featured_projects), userId]
    );

    return res.json({
      message: "Portafolio actualizado correctamente.",
      featured_projects,
    });
  } catch (err) {
    console.error("Error actualizando portafolio:", err);
    return res
      .status(500)
      .json({ message: "Error al actualizar el portafolio." });
  }
};

exports.uploadPortfolioImage = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se envió ninguna imagen." });
    }

    // uploadToS3 recibe el archivo buffer de multer.memoryStorage()
    const imageUrl = await uploadToS3(req.file);

    return res.json({ url: imageUrl });
  } catch (err) {
    console.error("Error subiendo imagen de portafolio:", err);
    return res
      .status(500)
      .json({ message: "Error al subir la imagen de portafolio." });
  }
};