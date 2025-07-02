const pool = require('../config/db');

// Obtener todas las solicitudes pendientes
exports.getPendingVerifications = async (req, res) => {
  try {
    console.log("🔍 Iniciando consulta de verificaciones pendientes...");

    const query = `
      SELECT v.id, v.user_id, v.file_url, v.status, v.created_at,
             u.full_name, u.email, u.username
      FROM verifications v
      JOIN users u ON u.id = v.user_id
      WHERE v.status = 'pending'
      ORDER BY v.created_at DESC
    `;

    console.log("🧠 Query SQL:");
    console.log(query);

    const result = await pool.query(query);

    console.log("✅ Verificaciones obtenidas:", result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener verificaciones pendientes:");
    console.error(err); // muestra mensaje completo del error
    res.status(500).json({ error: 'Error al obtener verificaciones' });
  }
};


// Aprobar una solicitud
exports.approveVerification = async (req, res) => {
  const { verificationId } = req.params;
  const adminId = req.user?.id;

  try {
    await pool.query(`
      UPDATE verifications
      SET status = 'approved'
      WHERE id = $1
    `, [verificationId]);

    await pool.query(`
      UPDATE users
      SET is_freelancer = TRUE
      WHERE id = (SELECT user_id FROM verifications WHERE id = $1)
    `, [verificationId]);

    // Auditoría
    await pool.query(`
      INSERT INTO verification_logs (verification_id, admin_id, action, timestamp)
      VALUES ($1, $2, 'approved', NOW())
    `, [verificationId, adminId]);

    res.json({ message: 'Solicitud aprobada correctamente' });
  } catch (err) {
    console.error('Error al aprobar verificación:', err);
    res.status(500).json({ error: 'Error al aprobar la solicitud' });
  }
};

// Rechazar una solicitud
exports.rejectVerification = async (req, res) => {
  const { verificationId } = req.params;
  const adminId = req.user?.id;

  try {
    await pool.query(`
      UPDATE verifications
      SET status = 'rejected'
      WHERE id = $1
    `, [verificationId]);

    await pool.query(`
      INSERT INTO verification_logs (verification_id, admin_id, action, timestamp)
      VALUES ($1, $2, 'rejected', NOW())
    `, [verificationId, adminId]);

    res.json({ message: 'Solicitud rechazada correctamente' });
  } catch (err) {
    console.error('Error al rechazar verificación:', err);
    res.status(500).json({ error: 'Error al rechazar la solicitud' });
  }
};
