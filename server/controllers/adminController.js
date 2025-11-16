const pool = require('../config/db');
const { deleteFromS3 } = require('../services/uploadService'); // asegúrate de tener la ruta correcta

// Obtener todas las solicitudes pendientes
exports.getPendingVerifications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id,
        v.user_id,
        v.file_url,
        v.status,
        v.created_at,

        u.full_name,
        u.email,
        u.username,

        fp.alias,
        fp.description,
        fp.languages,
        fp.categories,
        fp.skills,
        fp.education,
        fp.website,
        fp.social_links

      FROM verifications v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = v.user_id
      WHERE v.status = 'pending'
      ORDER BY v.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener verificaciones pendientes:", err);
    res.status(500).json({ error: 'Error al obtener verificaciones' });
  }
};

// Aprobar una solicitud
exports.approveVerification = async (req, res) => {
  const { verificationId } = req.params;
  const adminId = req.user?.id;

  try {
    // Obtener la URL del archivo para eliminarlo de S3
    const fileResult = await pool.query(
      `SELECT file_url, user_id FROM verifications WHERE id = $1`,
      [verificationId]
    );
    const fileUrl = fileResult.rows[0]?.file_url;
    const userId = fileResult.rows[0]?.user_id;

    // Marcar como aprobada
    await pool.query(`
      UPDATE verifications
      SET status = 'approved'
      WHERE id = $1
    `, [verificationId]);

    // Actualizar el usuario: marcar como freelancer y cambiar rol
    await pool.query(`
      UPDATE users
      SET is_freelancer = TRUE, role_id = 2
      WHERE id = $1
    `, [userId]);

    // Registrar en logs (usando action_by)
    await pool.query(`
      INSERT INTO verification_logs (verification_id, action_by, action, created_at)
      VALUES ($1, $2, 'approved', NOW())
    `, [verificationId, adminId]);

    // Eliminar el archivo de S3 si existe
    if (fileUrl) {
      await deleteFromS3(fileUrl);
    }

    res.json({ message: 'Solicitud aprobada correctamente' });
  } catch (err) {
    console.error('Error al aprobar verificación:', err);
    res.status(500).json({ error: 'Error al aprobar la solicitud' });
  }
};

// Rechazar una solicitud
exports.rejectVerification = async (req, res) => {
  const { verificationId } = req.params;
  const { message } = req.body;
  const adminId = req.user?.id;

  try {
    const fileResult = await pool.query(
      `SELECT file_url FROM verifications WHERE id = $1`,
      [verificationId]
    );
    const fileUrl = fileResult.rows[0]?.file_url;

    await pool.query(`
      UPDATE verifications
      SET status = 'rejected', rejection_message = $1
      WHERE id = $2
    `, [message || null, verificationId]);

    await pool.query(`
      INSERT INTO verification_logs (verification_id, action_by, action, message, created_at)
      VALUES ($1, $2, 'rejected', $3, NOW())
    `, [verificationId, adminId, message || null]);

    if (fileUrl) {
      await deleteFromS3(fileUrl);
    }

    res.json({ message: 'Solicitud rechazada correctamente' });
  } catch (err) {
    console.error('Error al rechazar verificación:', err);
    res.status(500).json({ error: 'Error al rechazar la solicitud' });
  }
};

exports.getAllDisputes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.email AS opened_by_email
       FROM disputes d
       JOIN users u ON u.id = d.opened_by
       WHERE d.status = 'open'
       ORDER BY d.opened_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener disputas:", err);
    res.status(500).json({ error: "Error interno al obtener disputas" });
  }
};

exports.acceptDispute = async (req, res) => {
  const adminId = req.user.id;
  const disputeId = req.params.id;

  try {
    // 1. Cambiar estado a resuelta
    await pool.query(`
      UPDATE disputes
      SET status = 'resuelta', closed_by = $1, closed_at = NOW(), resolution = 'Aceptada por el administrador'
      WHERE id = $2
    `, [adminId, disputeId]);

    // 2. Obtener el proyecto
    const { rows } = await pool.query(`SELECT project_id FROM disputes WHERE id = $1`, [disputeId]);
    const projectId = rows[0]?.project_id;

    // 3. Regresar a estado in_progress
    await pool.query(`
      UPDATE projects SET status = 'in_progress' WHERE id = $1
    `, [projectId]);

    // 4. Notificar al freelancer
    const freelancerRes = await pool.query(`
      SELECT freelancer_id FROM projects WHERE id = $1
    `, [projectId]);
    const freelancerId = freelancerRes.rows[0]?.freelancer_id;

    await pool.query(`
      INSERT INTO dispute_logs (dispute_id, action_by, action_type, action_description)
      VALUES ($1, $2, 'decisión', 'El proyecto ha sido reabierto. Puedes continuar trabajando en él.')
    `, [disputeId, freelancerId]);

    res.json({ message: "Disputa aceptada, proyecto reabierto." });
  } catch (err) {
    console.error("Error al aceptar disputa:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.rejectDispute = async (req, res) => {
  const adminId = req.user.id;
  const disputeId = req.params.id;

  try {
    // 1. Cambiar estado a irresoluble
    await pool.query(`
      UPDATE disputes
      SET status = 'irresoluble', closed_by = $1, closed_at = NOW(), resolution = 'Rechazada por el administrador'
      WHERE id = $2
    `, [adminId, disputeId]);

    // 2. Obtener quien abrió la disputa
    const result = await pool.query(`SELECT opened_by FROM disputes WHERE id = $1`, [disputeId]);
    const clientId = result.rows[0]?.opened_by;

    // 3. Registrar notificación en logs
    await pool.query(`
      INSERT INTO dispute_logs (dispute_id, action_by, action_type, action_description)
      VALUES ($1, $2, 'decisión', 'La disputa fue rechazada. Puedes volver a enviarla si lo consideras necesario.')
    `, [disputeId, clientId]);

    res.json({ message: "Disputa rechazada, el cliente puede volver a enviarla." });
  } catch (err) {
    console.error("Error al rechazar disputa:", err);
    res.status(500).json({ error: "Error interno" });
  }
};
