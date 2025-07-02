// server/controllers/serviceController.js
const pool = require('../config/db');
const { uploadToS3 } = require('../services/uploadService');

exports.getAllServices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id AS category_id,
        c.name AS category_name,
        json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'price', s.price,
            'freelancer_id', s.freelancer_id,
            'created_at', s.created_at
          )
        ) AS services
      FROM categories c
      LEFT JOIN services s ON c.id = s.category_id
      GROUP BY c.id, c.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching services:", err.message);
    res.status(500).json({ error: "Error fetching services", detail: err.message});
  }
};


exports.createService = async (req, res) => {
  const { title, description, price, freelancer_id, category_id } = req.body;

  try {
    // Verifica que el archivo exista
    if (!req.files || !req.files.image || !req.files.image[0]) {
      return res.status(400).json({ error: "Falta la imagen del servicio." });
    }

    // Subir la imagen a S3
    const imageFile = req.files.image[0];
    const imageUrl = await uploadToS3(imageFile);

    // Insertar en la base de datos
    const result = await pool.query(
      `INSERT INTO services (title, description, price, freelancer_id, category_id, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, price, freelancer_id, category_id, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating service:', err.message);
    res.status(500).json({ error: 'Error al crear el servicio.' });
  }
};

exports.getServicesByCategory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id AS id,
        c.name AS name,
        json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'price', s.price,
            'user_alias', u.username,
            'image_url', s.image_url
          )
        ) AS services
      FROM categories c
      JOIN services s ON s.category_id = c.id
      JOIN users u ON u.id = s.freelancer_id
      WHERE s.is_active = TRUE
      GROUP BY c.id, c.name
      ORDER BY c.name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categorized services:', err.message);
    res.status(500).json({ error: 'Error fetching categorized services' });
  }
};
