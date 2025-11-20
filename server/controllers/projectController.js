//projectController.js
const pool = require("../config/db");
const { uploadToS3 } = require('../services/uploadService');

exports.getMyProjects = async (req, res) => {
  const userId = req.user?.id;
  const roleId = req.user?.role_id;
  const role = roleId === 1 ? "client" : roleId === 2 ? "freelancer" : null;

  try {
    let result;

    if (role === "client") {
      result = await pool.query(`
        SELECT 
          p.id,
          p.status,
          p.started_at,
          p.contract_price,
          p.contract_deadline,
          COALESCE(s.title, r.title, s2.title) AS service_title,
          u.username AS freelancer_name
        FROM projects p
        LEFT JOIN requests r ON r.id = p.request_id
        LEFT JOIN services s ON s.id = p.service_id
        LEFT JOIN services s2 ON s2.id = (
          SELECT sr.service_id
          FROM service_requests sr
          WHERE sr.id = p.service_request_id
        )
        LEFT JOIN users u ON u.id = p.freelancer_id
        WHERE p.client_id = $1
        ORDER BY p.started_at DESC NULLS LAST, p.created_at DESC;
      `, [userId]);

    } else if (role === "freelancer") {
      result = await pool.query(`
        SELECT 
          p.id,
          p.status,
          p.started_at,
          p.contract_price,
          p.contract_deadline,
          COALESCE(s.title, r.title, s2.title) AS service_title,
          u.username AS client_name
        FROM projects p
        LEFT JOIN requests r ON r.id = p.request_id
        LEFT JOIN services s ON s.id = p.service_id
        LEFT JOIN services s2 ON s2.id = (
          SELECT sr.service_id
          FROM service_requests sr
          WHERE sr.id = p.service_request_id
        )
        LEFT JOIN users u ON u.id = p.client_id
        WHERE p.freelancer_id = $1
        ORDER BY p.started_at DESC NULLS LAST, p.created_at DESC;
      `, [userId]);

    } else {
      return res.status(403).json({ error: "Rol no autorizado para ver proyectos" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener proyectos:", err);
    res.status(500).json({ error: "Error interno al obtener proyectos" });
  }
};

exports.getProjectById = async (req, res) => {
  const userId = req.user?.id;
  const projectId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        p.client_accepted,
        p.freelancer_accepted,
        u1.username AS client_name,
        u2.username AS freelancer_name,

        -- Título del servicio / request
        COALESCE(s.title, r.title, s3.title) AS service_title,

        -- Descripción
        COALESCE(s.description, r.description) AS description,

        -- Deadline del contrato / request / service_request
        COALESCE(
          p.contract_deadline,
          sr.proposed_deadline,
          r.deadline
        ) AS deadline,

        -- Monto
        COALESCE(
          p.contract_price,
          s.price,
          r.budget,
          pr.proposed_price,
          sr.proposed_budget
        ) AS amount

      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.client_id
      LEFT JOIN users u2 ON u2.id = p.freelancer_id

      -- Servicio publicado
      LEFT JOIN services s ON s.id = p.service_id

      -- Solicitud directa
      LEFT JOIN requests r ON r.id = p.request_id

      -- Solicitud a un servicio
      LEFT JOIN service_requests sr ON sr.id = p.service_request_id
      LEFT JOIN services s3 ON s3.id = sr.service_id

      -- Propuesta aceptada relacionada
      LEFT JOIN proposals pr 
        ON pr.request_id = r.id 
       AND pr.freelancer_id = p.freelancer_id 
       AND pr.status = 'accepted'

      WHERE p.id = $1
        AND (p.client_id = $2 OR p.freelancer_id = $2)
    `, [projectId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado o sin acceso" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener proyecto:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.acceptContract = async (req, res) => {
  const userId = req.user?.id;
  const roleId = req.user?.role_id;
  const { id: projectId } = req.params;

  try {
    let columnToUpdate = roleId === 1 ? "client_accepted" : "freelancer_accepted";

    await pool.query(
      `UPDATE projects SET ${columnToUpdate} = TRUE WHERE id = $1 AND (client_id = $2 OR freelancer_id = $2)`,
      [projectId, userId]
    );

    res.json({ message: "Contrato aceptado." });
  } catch (error) {
    console.error("Error al aceptar contrato:", error);
    res.status(500).json({ error: "Error al aceptar contrato" });
  }
};

exports.uploadDeliverable = async (req, res) => {
  const userId = req.user.id;
  const { projectId, deliverableId } = req.body;
  const file = req.file;

  try {
    if (!file) return res.status(400).json({ error: "No se envió archivo" });

    const { rows } = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND freelancer_id = $2`,
      [projectId, userId]
    );
    if (rows.length === 0) return res.status(403).json({ error: "No autorizado" });

    const fileUrl = await uploadToS3(file);

    if (deliverableId) {
      // Reemplazar archivo existente y aumentar versión
      await pool.query(
        `UPDATE deliverables
         SET file_url = $1,
             rejected_by_client = FALSE,
             rejection_message = NULL,
             version = version + 1,
             uploaded_at = NOW()
         WHERE id = $2`,
        [fileUrl, deliverableId]
      );
    } else {
      await pool.query(
        `INSERT INTO deliverables (project_id, freelancer_id, file_url, uploaded_at)
         VALUES ($1, $2, $3, NOW())`,
        [projectId, userId, fileUrl]
      );
    }

    res.json({ message: "Entregable enviado" });
  } catch (err) {
    console.error("Error al subir entregable:", err);
    res.status(500).json({ error: "Error interno" });
  }
};


exports.getDeliverables = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.role_id;
  const projectId = req.params.id;

  try {
    // Asegurarse de que el usuario sea parte del proyecto
    const projectRes = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND (client_id = $2 OR freelancer_id = $2)`,
      [projectId, userId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(403).json({ error: "No autorizado para ver este proyecto" });
    }

    const { rows } = await pool.query(
      `SELECT id, file_url, uploaded_at, approved_by_client, rejected_by_client, rejection_message
       FROM deliverables
       WHERE project_id = $1
       ORDER BY uploaded_at ASC`,
      [projectId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener entregables:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.approveDeliverable = async (req, res) => {
  const userId = req.user.id;
  const { deliverableId } = req.params;

  try {
    // Verifica que el usuario es cliente del proyecto relacionado
    const result = await pool.query(
      `SELECT d.*, p.client_id
       FROM deliverables d
       JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`,
      [deliverableId]
    );

    const deliverable = result.rows[0];
    if (!deliverable) return res.status(404).json({ error: "Entregable no encontrado" });
    if (deliverable.client_id !== userId) return res.status(403).json({ error: "No autorizado" });

    await pool.query(
      `UPDATE deliverables SET approved_by_client = TRUE WHERE id = $1`,
      [deliverableId]
    );

    res.json({ message: "Entregable aprobado correctamente" });
  } catch (err) {
    console.error("Error al aprobar entregable:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.approveProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    // Verificar que el usuario es cliente del proyecto
    const project = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND client_id = $2`,
      [projectId, userId]
    );
    if (project.rows.length === 0) {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Verificar que todos los entregables estén aprobados
    const notApproved = await pool.query(
      `SELECT COUNT(*) FROM deliverables WHERE project_id = $1 AND approved_by_client = FALSE`,
      [projectId]
    );

    if (parseInt(notApproved.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: "Faltan entregables por aprobar" });
    }

    // Marcar proyecto como completado y aprobado por cliente
    await pool.query(
      `UPDATE projects 
       SET status = 'completed',
           approved_by_client = TRUE,
           completed_at = NOW()
       WHERE id = $1`,
      [projectId]
    );

    // Obtener el service_id asociado (puede venir directo o desde service_requests)
    const serviceRes = await pool.query(
      `SELECT COALESCE(p.service_id, sr.service_id) AS service_id
       FROM projects p
       LEFT JOIN service_requests sr ON sr.id = p.service_request_id
       WHERE p.id = $1`,
      [projectId]
    );

    const serviceId = serviceRes.rows[0]?.service_id;

    // Si hay un servicio asociado, incrementar completed_orders
    if (serviceId) {
      await pool.query(
        `UPDATE services
         SET completed_orders = completed_orders + 1
         WHERE id = $1`,
        [serviceId]
      );
    }

    res.json({ message: "Proyecto aprobado y finalizado." });
  } catch (err) {
    console.error("Error al aprobar proyecto:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.rejectDeliverable = async (req, res) => {
  const userId = req.user.id;
  const { deliverableId } = req.params;
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `SELECT d.*, p.client_id
       FROM deliverables d
       JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [deliverableId]
    );

    const deliverable = result.rows[0];
    if (!deliverable) return res.status(404).json({ error: "Entregable no encontrado" });
    if (deliverable.client_id !== userId) return res.status(403).json({ error: "No autorizado" });

    await pool.query(
      `UPDATE deliverables
       SET rejected_by_client = TRUE,
           rejection_message = $1,
           approved_by_client = FALSE
       WHERE id = $2`,
      [reason, deliverableId]
    );

    res.json({ message: "Entregable rechazado correctamente" });
  } catch (err) {
    console.error("Error al rechazar entregable:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

