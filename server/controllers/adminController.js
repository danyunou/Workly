const pool = require('../config/db');
const { deleteFromS3 } = require('../services/uploadService'); 
const { createNotificationForUser } = require("./notificationController"); // ajusta la ruta si cambia

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
    // 1) Disputas + info base del proyecto y de los usuarios
    const { rows: baseDisputes } = await pool.query(
      `
      SELECT 
        d.id,
        d.project_id,
        d.opened_by,
        d.opened_at,
        d.description       AS dispute_description,
        d.policy_accepted,
        d.status            AS dispute_status,
        d.resolution,
        d.created_at,

        -- Quien abrió la disputa
        u.email             AS opened_by_email,
        u.full_name         AS opened_by_name,

        -- Proyecto
        p.title             AS project_title,
        p.description       AS project_description,
        p.status            AS project_status,
        p.deadline          AS project_deadline,
        p.budget            AS project_budget,
        p.scope             AS project_scope,   -- si no tienes esta columna, bórrala

        -- Cliente
        uc.id               AS client_id,
        uc.full_name        AS client_name,
        uc.email            AS client_email,

        -- Freelancer
        uf.id               AS freelancer_id,
        uf.full_name        AS freelancer_name,
        uf.email            AS freelancer_email

      FROM disputes d
      JOIN users u  ON u.id  = d.opened_by
      JOIN projects p ON p.id = d.project_id
      JOIN users uc ON uc.id = p.client_id
      JOIN users uf ON uf.id = p.freelancer_id
      WHERE d.status = 'open'
      ORDER BY d.opened_at DESC
      `
    );

    // 2) Para cada disputa, traer entregables, mensajes y logs
    const disputesWithDetails = [];

    for (const row of baseDisputes) {
      const [deliverablesRes, messagesRes, logsRes] = await Promise.all([
        // ENTREGABLES
        pool.query(
          `
          SELECT 
            id,
            description,
            file_url,
            status,
            created_at,
            submitted_by
          FROM deliverables
          WHERE project_id = $1
          ORDER BY created_at ASC
        `,
          [row.project_id]
        ),
        // MENSAJES (CHAT)
        pool.query(
          `
          SELECT
            id,
            sender_id,
            message,
            created_at
          FROM messages
          WHERE project_id = $1
          ORDER BY created_at ASC
        `,
          [row.project_id]
        ),
        // LOGS DE LA DISPUTA
        pool.query(
          `
          SELECT
            id,
            action_by,
            action_type,
            action_description,
            timestamp
          FROM dispute_logs
          WHERE dispute_id = $1
          ORDER BY timestamp ASC
        `,
          [row.id]
        ),
      ]);

      disputesWithDetails.push({
        ...row,
        deliverables: deliverablesRes.rows,
        messages: messagesRes.rows,
        logs: logsRes.rows,
      });
    }

    res.json(disputesWithDetails);
  } catch (err) {
    console.error("Error al obtener disputas:", err);
    res.status(500).json({ error: "Error interno al obtener disputas" });
  }
};


exports.acceptDispute = async (req, res) => {
  const adminId = req.user.id;
  const disputeId = req.params.id;
  const { reason } = req.body; // viene del front

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Traer la disputa + proyecto + cliente/freelancer
    const disputeRes = await client.query(
      `
      SELECT 
        d.*,
        p.client_id,
        p.freelancer_id
      FROM disputes d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = $1
      FOR UPDATE
      `,
      [disputeId]
    );

    if (disputeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Disputa no encontrada" });
    }

    const dispute = disputeRes.rows[0];

    // 2) Actualizar la disputa como resuelta, guardando la resolución
    const resolutionText =
      reason || "Disputa aceptada por el administrador y proyecto reabierto.";

    await client.query(
      `
      UPDATE disputes
      SET status = 'resuelta',
          closed_by = $1,
          closed_at = NOW(),
          resolution = $2
      WHERE id = $3
      `,
      [adminId, resolutionText, disputeId]
    );

    // 3) Reabrir el proyecto (estado in_progress)
    await client.query(
      `
      UPDATE projects
      SET status = 'in_progress'
      WHERE id = $1
      `,
      [dispute.project_id]
    );

    // 4) Registrar logs de la decisión
    await client.query(
      `
      INSERT INTO dispute_logs (dispute_id, action_by, action_type, action_description)
      VALUES 
        ($1, $2, 'decisión_admin', $3),
        ($1, $4, 'notificación', 'La disputa fue aceptada. El proyecto se ha reabierto, puedes continuar trabajando.'),
        ($1, $5, 'notificación', 'Tu disputa fue aceptada por el administrador. El proyecto ha sido reabierto.')
      `,
      [disputeId, adminId, resolutionText, dispute.freelancer_id, dispute.client_id]
    );

    // 5) Notificaciones a cliente y freelancer
    try {
      await createNotificationForUser(
        dispute.freelancer_id,
        "Un administrador aceptó la disputa y el proyecto fue reabierto. Revisa los detalles del caso.",
        "warning",
        `/projects/${dispute.project_id}`
      );

      await createNotificationForUser(
        dispute.client_id,
        "Tu disputa fue aceptada por el administrador y el proyecto se ha reabierto.",
        "info",
        `/projects/${dispute.project_id}`
      );
    } catch (notifyErr) {
      console.error("Error al crear notificaciones de aceptación de disputa:", notifyErr);
      // No hacemos rollback solo por notificaciones
    }

    await client.query("COMMIT");
    res.json({ message: "Disputa aceptada, proyecto reabierto." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al aceptar disputa:", err);
    res.status(500).json({ error: "Error interno" });
  } finally {
    client.release();
  }
};


exports.rejectDispute = async (req, res) => {
  const adminId = req.user.id;
  const disputeId = req.params.id;
  const { reason } = req.body; // viene del front

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Traer la disputa + proyecto + cliente/freelancer
    const disputeRes = await client.query(
      `
      SELECT 
        d.*,
        p.client_id,
        p.freelancer_id
      FROM disputes d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = $1
      FOR UPDATE
      `,
      [disputeId]
    );

    if (disputeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Disputa no encontrada" });
    }

    const dispute = disputeRes.rows[0];

    const resolutionText =
      reason || "Disputa rechazada por el administrador.";

    // 2) Marcar la disputa como 'irresoluble' y guardar la resolución
    await client.query(
      `
      UPDATE disputes
      SET status = 'irresoluble',
          closed_by = $1,
          closed_at = NOW(),
          resolution = $2
      WHERE id = $3
      `,
      [adminId, resolutionText, disputeId]
    );

    // 3) Logs de la decisión
    await client.query(
      `
      INSERT INTO dispute_logs (dispute_id, action_by, action_type, action_description)
      VALUES 
        ($1, $2, 'decisión_admin', $3),
        ($1, $4, 'notificación', 'La disputa fue rechazada por el administrador. Puedes revisar los motivos y, si lo consideras, volver a abrir otra disputa.'),
        ($1, $5, 'notificación', 'El administrador rechazó la disputa. Revisa los detalles y la resolución del caso.')
      `,
      [disputeId, adminId, resolutionText, dispute.client_id, dispute.freelancer_id]
    );

    // 4) Notificaciones a cliente y freelancer
    try {
      await createNotificationForUser(
        dispute.client_id,
        "Tu disputa fue rechazada por el administrador. Revisa los detalles y la resolución proporcionada.",
        "warning",
        `/projects/${dispute.project_id}`
      );

      await createNotificationForUser(
        dispute.freelancer_id,
        "El administrador rechazó la disputa asociada a uno de tus proyectos.",
        "info",
        `/projects/${dispute.project_id}`
      );
    } catch (notifyErr) {
      console.error("Error al crear notificaciones de rechazo de disputa:", notifyErr);
    }

    await client.query("COMMIT");
    res.json({ message: "Disputa rechazada, se notificó a las partes." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al rechazar disputa:", err);
    res.status(500).json({ error: "Error interno" });
  } finally {
    client.release();
  }
};
