// server/controllers/projectController.js
const pool = require("../config/db");
const { uploadToS3 } = require("../services/uploadService");
const { createNotificationForUser } = require("./notificationController");

/* =========================
 *  LISTADO Y DETALLE
 * ========================= */

exports.getMyProjects = async (req, res) => {
  const userId = req.user?.id;
  const roleId = req.user?.role_id;
  const role = roleId === 1 ? "client" : roleId === 2 ? "freelancer" : null;

  try {
    let result;

    if (role === "client") {
      result = await pool.query(
        `
        SELECT 
          p.id,
          p.status,
          p.started_at,
          p.contract_price,
          p.contract_deadline,
          COALESCE(s.title, s2.title) AS service_title,
          u.username AS freelancer_name
        FROM projects p
        LEFT JOIN services s 
          ON s.id = p.service_id                    -- proyecto desde servicio publicado
        LEFT JOIN service_requests sr 
          ON sr.id = p.service_request_id           -- proyecto desde service_request
        LEFT JOIN services s2 
          ON s2.id = sr.service_id                  -- servicio original de la solicitud
        LEFT JOIN users u 
          ON u.id = p.freelancer_id
        WHERE p.client_id = $1
        ORDER BY p.started_at DESC NULLS LAST, p.created_at DESC;
      `,
        [userId]
      );
    } else if (role === "freelancer") {
      result = await pool.query(
        `
        SELECT 
          p.id,
          p.status,
          p.started_at,
          p.contract_price,
          p.contract_deadline,
          COALESCE(s.title, s2.title) AS service_title,
          u.username AS client_name
        FROM projects p
        LEFT JOIN services s 
          ON s.id = p.service_id
        LEFT JOIN service_requests sr 
          ON sr.id = p.service_request_id
        LEFT JOIN services s2 
          ON s2.id = sr.service_id
        LEFT JOIN users u 
          ON u.id = p.client_id
        WHERE p.freelancer_id = $1
        ORDER BY p.started_at DESC NULLS LAST, p.created_at DESC;
      `,
        [userId]
      );
    } else {
      return res
        .status(403)
        .json({ error: "Rol no autorizado para ver proyectos" });
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
    const result = await pool.query(
      `
      SELECT 
        p.*,
        p.client_accepted,
        p.freelancer_accepted,
        u1.username AS client_name,
        u2.username AS freelancer_name,

        -- Título del servicio / service_request
        COALESCE(s.title, s3.title) AS service_title,

        -- Descripción: servicio o mensaje de la solicitud
        COALESCE(s.description, sr.message) AS description,

        -- Deadline del contrato / service_request
        COALESCE(
          p.contract_deadline,
          sr.proposed_deadline
        ) AS deadline,

        -- Monto del proyecto
        COALESCE(
          p.contract_price,
          pr.proposed_price,
          sr.proposed_budget,
          s.price
        ) AS amount

      FROM projects p
      LEFT JOIN users u1 ON u1.id = p.client_id
      LEFT JOIN users u2 ON u2.id = p.freelancer_id

      -- Proyecto creado directamente desde un servicio
      LEFT JOIN services s ON s.id = p.service_id

      -- Proyecto creado desde service_request
      LEFT JOIN service_requests sr ON sr.id = p.service_request_id
      LEFT JOIN services s3 ON s3.id = sr.service_id

      -- Propuesta aceptada relacionada (si aplica)
      LEFT JOIN proposals pr 
        ON pr.id = p.proposal_id
       AND pr.status = 'accepted'

      WHERE p.id = $1
        AND (p.client_id = $2 OR p.freelancer_id = $2)
    `,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Proyecto no encontrado o sin acceso" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener proyecto:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

/* =========================
 *  CONTRATO (ACEPTAR / EDITAR)
 * ========================= */

exports.acceptContract = async (req, res) => {
  const userId = req.user?.id;
  const roleId = req.user?.role_id;
  const { id: projectId } = req.params;

  try {
    const columnToUpdate =
      roleId === 1
        ? "client_accepted"
        : roleId === 2
        ? "freelancer_accepted"
        : null;

    if (!columnToUpdate) {
      return res
        .status(403)
        .json({ error: "Rol no autorizado para aceptar contrato" });
    }

    // 1️⃣ Marcar aceptación del rol
    const acceptRes = await pool.query(
      `
      UPDATE projects
      SET ${columnToUpdate} = TRUE
      WHERE id = $1
        AND (client_id = $2 OR freelancer_id = $2)
      RETURNING id, status, client_accepted, freelancer_accepted, client_id, freelancer_id;
      `,
      [projectId, userId]
    );

    if (acceptRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Proyecto no encontrado o sin acceso" });
    }

    let project = acceptRes.rows[0];
    let newStatus = project.status;

    // 🔔 Notificar a la otra parte que alguien aceptó el contrato
    try {
      const isClient = roleId === 1;
      const targetUserId = isClient ? project.freelancer_id : project.client_id;
      const actorLabel = isClient ? "El cliente" : "El freelancer";

      if (targetUserId) {
        await createNotificationForUser(
          targetUserId,
          `${actorLabel} ha aceptado el contrato del proyecto #${project.id}.`,
          "info",
          `/projects/${project.id}`
        );
      }
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en acceptContract:",
        notifyErr
      );
    }

    // 2️⃣ Si ambos ya aceptaron → pasar a 'awaiting_payment'
    if (project.client_accepted && project.freelancer_accepted) {
      if (
        project.status === "awaiting_contract" ||
        project.status === "pending_contract"
      ) {
        const statusRes = await pool.query(
          `
          UPDATE projects
          SET status = 'awaiting_payment'
          WHERE id = $1
          RETURNING status;
          `,
          [project.id]
        );
        newStatus = statusRes.rows[0].status;

        // 🔔 Notificación al cliente: listo para pagar
        try {
          await createNotificationForUser(
            project.client_id,
            `El contrato del proyecto #${project.id} ha sido aceptado por ambas partes. Ya puedes realizar el pago.`,
            "success",
            `/projects/${project.id}`
          );
        } catch (notifyErr) {
          console.error(
            "Error creando notificación de awaiting_payment:",
            notifyErr
          );
        }
      }
    }

    res.json({
      message: "Contrato aceptado.",
      status: newStatus,
      client_accepted: project.client_accepted,
      freelancer_accepted: project.freelancer_accepted,
    });
  } catch (error) {
    console.error("Error al aceptar contrato:", error);
    res.status(500).json({ error: "Error al aceptar contrato" });
  }
};

exports.updateContract = async (req, res) => {
  const userId = req.user?.id;
  const projectId = req.params.id;
  const { contract_price, contract_deadline } = req.body;

  try {
    // 1️⃣ Verificar que el usuario es parte del proyecto
    const projectRes = await pool.query(
      `
      SELECT 
        id,
        status,
        client_id,
        freelancer_id,
        client_accepted,
        freelancer_accepted
      FROM projects
      WHERE id = $1
        AND (client_id = $2 OR freelancer_id = $2)
      `,
      [projectId, userId]
    );

    if (projectRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Proyecto no encontrado o sin acceso" });
    }

    const project = projectRes.rows[0];

    // 2️⃣ Restringir estados en los que se puede editar
    if (
      project.status === "completed" ||
      project.status === "cancelled" ||
      project.status === "in_progress" ||
      project.status === "in_revision"
    ) {
      return res.status(400).json({
        error:
          "El contrato ya no puede modificarse en el estado actual del proyecto.",
      });
    }

    // 3️⃣ Construir SET dinámico
    const fields = [];
    const values = [];
    let idx = 1;

    if (contract_price !== undefined) {
      fields.push(`contract_price = $${idx++}`);
      values.push(contract_price);
    }

    if (contract_deadline !== undefined) {
      fields.push(`contract_deadline = $${idx++}`);
      values.push(contract_deadline);
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ error: "No se recibieron cambios para el contrato." });
    }

    // Siempre que se edita el contrato:
    //  - se resetean las aceptaciones
    //  - el estado vuelve a 'awaiting_contract'
    fields.push("client_accepted = FALSE");
    fields.push("freelancer_accepted = FALSE");
    fields.push(`status = 'awaiting_contract'`);
    fields.push("updated_at = NOW()");

    const updateQuery = `
      UPDATE projects
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(projectId);

    const updatedRes = await pool.query(updateQuery, values);
    const updatedProject = updatedRes.rows[0];

    // 🔔 Notificaciones a ambos: contrato modificado
    try {
      const msg = `El contrato del proyecto #${updatedProject.id} fue modificado. Deben revisarlo y aceptarlo nuevamente.`;

      await createNotificationForUser(
        updatedProject.client_id,
        msg,
        "info",
        `/projects/${updatedProject.id}`
      );

      await createNotificationForUser(
        updatedProject.freelancer_id,
        msg,
        "info",
        `/projects/${updatedProject.id}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en updateContract:",
        notifyErr
      );
    }

    return res.json({
      message: "Contrato actualizado. Ambos deben aceptarlo de nuevo.",
      project: updatedProject,
    });
  } catch (err) {
    console.error("Error al actualizar contrato:", err);
    return res
      .status(500)
      .json({ error: "Error interno al actualizar contrato" });
  }
};

/* =========================
 *  ENTREGABLES
 * ========================= */

exports.uploadDeliverable = async (req, res) => {
  const userId = req.user.id;
  const { projectId, deliverableId } = req.body;
  const file = req.file;

  try {
    if (!file)
      return res.status(400).json({ error: "No se envió archivo" });

    const { rows } = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND freelancer_id = $2`,
      [projectId, userId]
    );
    if (rows.length === 0)
      return res.status(403).json({ error: "No autorizado" });

    const project = rows[0];

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

    // 🔔 Notificación al cliente: nuevo entregable
    try {
      await createNotificationForUser(
        project.client_id,
        `Tienes un nuevo entregable en el proyecto #${projectId}.`,
        "info",
        `/projects/${projectId}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en uploadDeliverable:",
        notifyErr
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
  const projectId = req.params.id;

  try {
    // Asegurarse de que el usuario sea parte del proyecto
    const projectRes = await pool.query(
      `SELECT * FROM projects WHERE id = $1 AND (client_id = $2 OR freelancer_id = $2)`,
      [projectId, userId]
    );

    if (projectRes.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "No autorizado para ver este proyecto" });
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
      `SELECT d.*, p.client_id, p.freelancer_id, p.id AS project_id
       FROM deliverables d
       JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`,
      [deliverableId]
    );

    const deliverable = result.rows[0];
    if (!deliverable)
      return res
        .status(404)
        .json({ error: "Entregable no encontrado" });
    if (deliverable.client_id !== userId)
      return res.status(403).json({ error: "No autorizado" });

    await pool.query(
      `UPDATE deliverables 
       SET approved_by_client = TRUE, 
           rejected_by_client = FALSE, 
           rejection_message = NULL 
       WHERE id = $1`,
      [deliverableId]
    );

    // 🔔 Notificación al freelancer: entregable aprobado
    try {
      await createNotificationForUser(
        deliverable.freelancer_id,
        `Un entregable del proyecto #${deliverable.project_id} fue aprobado por el cliente.`,
        "success",
        `/projects/${deliverable.project_id}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en approveDeliverable:",
        notifyErr
      );
    }

    res.json({ message: "Entregable aprobado correctamente" });
  } catch (err) {
    console.error("Error al aprobar entregable:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

exports.rejectDeliverable = async (req, res) => {
  const userId = req.user.id;
  const { deliverableId } = req.params;
  const { reason } = req.body;

  try {
    const result = await pool.query(
      `SELECT d.*, p.client_id, p.freelancer_id, p.id AS project_id
       FROM deliverables d
       JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [deliverableId]
    );

    const deliverable = result.rows[0];
    if (!deliverable)
      return res
        .status(404)
        .json({ error: "Entregable no encontrado" });
    if (deliverable.client_id !== userId)
      return res.status(403).json({ error: "No autorizado" });

    await pool.query(
      `UPDATE deliverables
       SET rejected_by_client = TRUE,
           rejection_message = $1,
           approved_by_client = FALSE
       WHERE id = $2`,
      [reason, deliverableId]
    );

    // 🔔 Notificación al freelancer: entregable rechazado
    try {
      const preview =
        reason && reason.length > 80
          ? reason.slice(0, 77).trimEnd() + "..."
          : reason || "El cliente ha rechazado el entregable.";

      await createNotificationForUser(
        deliverable.freelancer_id,
        `Un entregable del proyecto #${deliverable.project_id} fue rechazado. Motivo: "${preview}"`,
        "warning",
        `/projects/${deliverable.project_id}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en rejectDeliverable:",
        notifyErr
      );
    }

    res.json({ message: "Entregable rechazado correctamente" });
  } catch (err) {
    console.error("Error al rechazar entregable:", err);
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

    const proj = project.rows[0];

    // Verificar que todos los entregables estén aprobados
    const notApproved = await pool.query(
      `SELECT COUNT(*) FROM deliverables WHERE project_id = $1 AND approved_by_client = FALSE`,
      [projectId]
    );

    if (parseInt(notApproved.rows[0].count, 10) > 0) {
      return res
        .status(400)
        .json({ error: "Faltan entregables por aprobar" });
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

    // 🔔 Notificaciones al finalizar proyecto
    try {
      // Cliente (confirmación)
      await createNotificationForUser(
        proj.client_id,
        `Has marcado el proyecto #${projectId} como completado.`,
        "success",
        `/projects/${projectId}`
      );

      // Freelancer
      await createNotificationForUser(
        proj.freelancer_id,
        `El cliente ha marcado el proyecto #${projectId} como completado.`,
        "info",
        `/projects/${projectId}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en approveProject:",
        notifyErr
      );
    }

    res.json({ message: "Proyecto aprobado y finalizado." });
  } catch (err) {
    console.error("Error al aprobar proyecto:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

/* =========================
 *  CREACIÓN DE PROYECTO
 * ========================= */

exports.createProjectFromServiceRequest = async (req, res) => {
  const freelancerId = req.user?.id;
  const { service_request_id } = req.body;

  if (!service_request_id) {
    return res
      .status(400)
      .json({ error: "Falta service_request_id en el body." });
  }

  try {
    // 1️⃣ Obtener la solicitud y el servicio asociado
    const srQuery = await pool.query(
      `
      SELECT 
        sr.*,
        s.freelancer_id AS owner_freelancer,
        s.id AS service_id,
        s.title AS service_title
      FROM service_requests sr
      JOIN services s ON s.id = sr.service_id
      WHERE sr.id = $1
      `,
      [service_request_id]
    );

    if (srQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Solicitud de servicio no encontrada." });
    }

    const sr = srQuery.rows[0];

    // 2️⃣ Validar que el freelancer logueado es el dueño del servicio
    if (sr.owner_freelancer !== freelancerId) {
      return res.status(403).json({
        error: "No tienes permiso para aceptar esta solicitud.",
      });
    }

    // 3️⃣ Evitar aceptar 2 veces
    if (sr.status !== "pending_freelancer") {
      return res.status(400).json({
        error: "La solicitud ya fue respondida.",
      });
    }

    // 4️⃣ Crear proyecto con la info de la solicitud
    const newProject = await pool.query(
      `
      INSERT INTO projects (
        client_id,
        freelancer_id,
        service_id,
        service_request_id,
        status,
        contract_price,
        contract_deadline,
        created_at
      )
      VALUES (
        $1, $2, $3, $4,
        'awaiting_contract',
        $5,
        $6,
        NOW()
      )
      RETURNING *
      `,
      [
        sr.client_id, // cliente que hizo la solicitud
        freelancerId, // freelancer dueño del servicio
        sr.service_id, // servicio relacionado
        sr.id, // service_request_id
        sr.proposed_budget || null,
        sr.proposed_deadline || null,
      ]
    );

    const project = newProject.rows[0];

    // 5️⃣ Actualizar estado de la solicitud
    await pool.query(
      `UPDATE service_requests SET status = 'accepted' WHERE id = $1`,
      [service_request_id]
    );

    // 🔔 Notificación al cliente: solicitud aceptada y proyecto creado
    try {
      await createNotificationForUser(
        sr.client_id,
        `Tu solicitud de servicio "${sr.service_title}" fue aceptada. Se creó el proyecto #${project.id}.`,
        "success",
        `/projects/${project.id}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en createProjectFromServiceRequest:",
        notifyErr
      );
    }

    return res.status(201).json(project);
  } catch (err) {
    console.error("Error al crear proyecto desde solicitud:", err);
    return res.status(500).json({
      error: "Error interno al crear proyecto desde solicitud.",
    });
  }
};

exports.createProjectFromProposal = async (req, res) => {
  const { proposal_id } = req.body;
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Traer datos de la propuesta + solicitud
    const proposalRes = await client.query(
      `SELECT pr.*, sr.client_id, sr.id AS service_request_id
       FROM proposals pr
       JOIN service_requests sr ON sr.id = pr.service_request_id
       WHERE pr.id = $1`,
      [proposal_id]
    );

    const proposal = proposalRes.rows[0];

    // 2) Crear proyecto
    const projectRes = await client.query(
      `INSERT INTO projects (
        client_id,
        freelancer_id,
        service_request_id,
        status,
        contract_price,
        contract_deadline,
        created_at
      )
      VALUES ($1, $2, $3, 'pending_acceptance', $4, $5, NOW())
      RETURNING *`,
      [
        proposal.client_id,
        proposal.freelancer_id,
        proposal.service_request_id,
        proposal.proposed_price,
        proposal.estimated_deadline, // adapta al nombre real del campo si difiere
      ]
    );

    const project = projectRes.rows[0];

    // 3) Actualizar conversación existente para ligarla al proyecto
    await client.query(
      `UPDATE conversations
       SET project_id = $1
       WHERE service_request_id = $2`,
      [project.id, proposal.service_request_id]
    );

    // 4) Crear project_scopes v1 (alcance base)
    const scopeTitle = "Alcance inicial del proyecto";
    const scopeDescription =
      "Versión inicial del alcance basada en la propuesta aceptada y el brief del cliente.";
    const deliverablesText =
      proposal.deliverables || "Ver detalles en la propuesta aceptada."; // adapta al campo real

    await client.query(
      `INSERT INTO project_scopes (
        project_id,
        version,
        title,
        description,
        deliverables,
        exclusions,
        revision_limit,
        deadline,
        price,
        created_by
      )
      VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        project.id,
        scopeTitle,
        scopeDescription,
        deliverablesText,
        null, // exclusions
        proposal.revision_limit || 1,
        project.contract_deadline,
        project.contract_price,
        userId, // quien está creando el proyecto (normalmente cliente)
      ]
    );

    // 5) Mensaje de sistema en el chat
    await client.query(
      `INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        type,
        is_read,
        created_at
      )
      SELECT c.id, $2,
        $3,
        'system',
        FALSE,
        NOW()
      FROM conversations c
      WHERE c.service_request_id = $1`,
      [
        proposal.service_request_id,
        userId,
        `Se creó el proyecto #${project.id}. Contrato pendiente de aceptación.`,
      ]
    );

    await client.query("COMMIT");

    // 🔔 Notificaciones para ambos
    try {
      // Cliente
      await createNotificationForUser(
        proposal.client_id,
        `Se creó el proyecto #${project.id} a partir de la propuesta aceptada.`,
        "success",
        `/projects/${project.id}`
      );

      // Freelancer
      await createNotificationForUser(
        proposal.freelancer_id,
        `Se creó el proyecto #${project.id} con tu propuesta. El contrato está pendiente de aceptación.`,
        "info",
        `/projects/${project.id}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificaciones en createProjectFromProposal:",
        notifyErr
      );
    }

    res.status(201).json(project);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear proyecto desde propuesta:", error);
    res.status(500).json({ error: "Error al crear proyecto" });
  } finally {
    client.release();
  }
};

/* =========================
 *  SCOPE (project_scopes)
 * ========================= */

exports.getCurrentScope = async (req, res) => {
  const { projectId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM project_scopes
       WHERE project_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [projectId]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "No hay scope para este proyecto" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener scope actual:", error);
    res.status(500).json({ error: "Error al obtener scope actual" });
  }
};

exports.getHistory = async (req, res) => {
  const { projectId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * 
       FROM project_scopes
       WHERE project_id = $1
       ORDER BY version ASC`,
      [projectId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener historial de scopes:", error);
    res.status(500).json({ error: "Error al obtener historial de scopes" });
  }
};

exports.createNewScopeVersion = async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    deliverables,
    exclusions,
    revision_limit,
    deadline,
    price,
  } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Obtener versión actual
    const lastScopeRes = await client.query(
      `SELECT version
       FROM project_scopes
       WHERE project_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [projectId]
    );

    const lastVersion = lastScopeRes.rows[0]?.version || 0;
    const newVersion = lastVersion + 1;

    // 2) Crear nueva versión
    const scopeRes = await client.query(
      `INSERT INTO project_scopes (
        project_id,
        version,
        title,
        description,
        deliverables,
        exclusions,
        revision_limit,
        deadline,
        price,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        projectId,
        newVersion,
        title,
        description,
        deliverables,
        exclusions,
        revision_limit,
        deadline,
        price,
        userId,
      ]
    );

    // 3) Resetear aceptaciones de contrato (y opcionalmente actualizar precio/deadline)
    const projRes = await client.query(
      `UPDATE projects
       SET client_accepted = FALSE,
           freelancer_accepted = FALSE,
           contract_price = COALESCE($2, contract_price),
           contract_deadline = COALESCE($3, contract_deadline)
       WHERE id = $1
       RETURNING client_id, freelancer_id`,
      [projectId, price, deadline]
    );

    const project = projRes.rows[0];

    // 4) Mensaje de sistema en el chat (si ya hay conversación)
    await client.query(
      `INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        type,
        is_read,
        created_at
      )
      SELECT c.id, $2,
        $3,
        'system',
        FALSE,
        NOW()
      FROM conversations c
      WHERE c.project_id = $1`,
      [
        projectId,
        userId,
        `Se creó la versión ${newVersion} del alcance del proyecto.`,
      ]
    );

    // 🔔 5) NOTIFICACIONES
    try {
      const isClient = userId === project.client_id;
      const actorLabel = isClient ? "El cliente" : "El freelancer";

      const message =
        `${actorLabel} creó la versión ${newVersion} del alcance del proyecto. ` +
        `Es necesario revisar y aceptar nuevamente el contrato.`;

      // Notificar al cliente
      await createNotificationForUser(
        project.client_id,
        message,
        "info",
        `/projects/${projectId}`
      );

      // Notificar al freelancer
      await createNotificationForUser(
        project.freelancer_id,
        message,
        "info",
        `/projects/${projectId}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificaciones en createNewScopeVersion:",
        notifyErr
      );
    }

    await client.query("COMMIT");
    res.status(201).json(scopeRes.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear nueva versión de scope:", error);
    res
      .status(500)
      .json({ error: "Error al crear nueva versión de scope" });
  } finally {
    client.release();
  }
};
