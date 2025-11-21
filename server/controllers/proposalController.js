const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

/**
 * Obtener todas las propuestas de una service_request específica
 * requestId = service_request_id
 */
exports.getProposalsByRequest = async (req, res) => {
  const { requestId } = req.params; // este es el service_request_id

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.profile_picture
      FROM proposals p
      JOIN users u 
        ON u.id = p.freelancer_id
      WHERE p.request_id = $1
      ORDER BY p.created_at DESC
      `,
      [requestId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener propuestas por request:", err);
    res.status(500).json({ error: "Error al obtener propuestas" });
  }
};

/**
 * Aceptar propuesta, marcar service_request como accepted,
 * crear proyecto + conversación + project_scope
 */
exports.acceptProposal = async (req, res) => {
  const { proposalId } = req.params;
  const clientId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Verificar que la propuesta exista y pertenezca a una service_request del cliente
    const proposalCheck = await client.query(
      `
      SELECT 
        p.*,
        sr.client_id,
        sr.id AS service_request_id,
        s.title AS service_title
      FROM proposals p
      JOIN service_requests sr 
        ON p.request_id = sr.id               -- request_id AHORA es service_request_id
      LEFT JOIN services s 
        ON s.id = sr.service_id
      WHERE p.id = $1
      `,
      [proposalId]
    );

    if (proposalCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Propuesta no encontrada" });
    }

    const proposal = proposalCheck.rows[0];

    if (proposal.client_id !== clientId) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "No autorizado para aceptar esta propuesta" });
    }

    // 2) Cambiar estado de la service_request a "accepted"
    await client.query(
      `
      UPDATE service_requests 
      SET status = 'accepted',
          last_status_change_at = NOW()
      WHERE id = $1
      `,
      [proposal.service_request_id]
    );

    // 3) Obtener IDs de freelancers con otras propuestas para notificaciones luego
    const othersRes = await client.query(
      `
      SELECT freelancer_id
      FROM proposals
      WHERE request_id = $1 AND id != $2
      `,
      [proposal.service_request_id, proposalId]
    );
    const otherFreelancers = othersRes.rows.map((r) => r.freelancer_id);

    // 4) Rechazar otras propuestas de la misma service_request
    await client.query(
      `
      UPDATE proposals 
      SET status = 'rejected' 
      WHERE request_id = $1 AND id != $2
      `,
      [proposal.service_request_id, proposalId]
    );

    // 5) Marcar propuesta aceptada
    await client.query(
      `
      UPDATE proposals 
      SET status = 'accepted' 
      WHERE id = $1
      `,
      [proposalId]
    );

    // 6) Crear proyecto (pendiente de contrato) usando columnas de la propuesta
    const projectRes = await client.query(
      `
      INSERT INTO projects (
         proposal_id,
         request_id,          -- deprecado, lo dejamos por compatibilidad (mismo valor)
         service_request_id,  -- el que realmente se usa ahora
         freelancer_id,
         client_id,
         status,
         created_at,
         payment_status,
         client_accepted,
         freelancer_accepted,
         contract_price,
         contract_deadline,
         contract_terms,
         revision_limit,
         revision_count
       )
       VALUES (
         $1,                 -- proposal_id
         $2,                 -- request_id ( = service_request_id por ahora)
         $2,                 -- service_request_id
         $3,                 -- freelancer_id
         $4,                 -- client_id
         'pending_contract',
         NOW(),
         'pending',
         FALSE,
         FALSE,
         $5,                 -- contract_price
         $6,                 -- contract_deadline
         $7,                 -- contract_terms (scope)
         $8,                 -- revision_limit (usamos estimated_days por ahora)
         0                   -- revision_count
       )
       RETURNING *
      `,
      [
        proposalId,
        proposal.service_request_id, // antes era proposal.request_id
        proposal.freelancer_id,
        clientId,
        proposal.proposed_price || null,
        proposal.proposed_deadline || null,
        proposal.scope || null,
        proposal.estimated_days || 0,
      ]
    );

    const project = projectRes.rows[0];

    // 7) Crear conversación asociada al proyecto
    const conversationRes = await client.query(
      `
      INSERT INTO conversations (project_id, created_at)
      VALUES ($1, NOW())
      RETURNING *
      `,
      [project.id]
    );

    const conversation = conversationRes.rows[0];

    // 8) Crear project_scope v1 basado en la propuesta
    const scopeTitle = "Alcance inicial del proyecto";
    const scopeDescription =
      proposal.scope ||
      "Alcance inicial basado en la propuesta aceptada de la solicitud.";

    await client.query(
      `
      INSERT INTO project_scopes (
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
      VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        project.id,
        scopeTitle,
        scopeDescription,
        null, // deliverables
        null, // exclusions
        project.revision_limit || null,
        project.contract_deadline,
        project.contract_price,
        clientId,
      ]
    );

    // 9) Mensaje de sistema en el chat
    await client.query(
      `
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        type,
        is_read,
        created_at
      )
      VALUES ($1, $2, $3, 'system', FALSE, NOW())
      `,
      [
        conversation.id,
        clientId,
        `Se creó el proyecto #${project.id} a partir de la propuesta aceptada. Contrato pendiente de aceptación.`,
      ]
    );

    await client.query("COMMIT");

    // 🔔 10) NOTIFICACIONES (fuera de la transacción)
    try {
      const requestTitle = proposal.service_title || "tu solicitud";

      // a) Freelancer seleccionado
      await createNotificationForUser(
        proposal.freelancer_id,
        `Tu propuesta fue aceptada para "${requestTitle}". Se creó el proyecto #${project.id}.`,
        "success",
        `/projects/${project.id}`
      );

      // b) Cliente (confirmación)
      await createNotificationForUser(
        clientId,
        `Has aceptado una propuesta para "${requestTitle}". Se creó el proyecto #${project.id}.`,
        "info",
        `/projects/${project.id}`
      );

      // c) Otros freelancers cuyas propuestas fueron rechazadas
      const uniqueOthers = [...new Set(otherFreelancers)];
      for (const freelancerId of uniqueOthers) {
        await createNotificationForUser(
          freelancerId,
          `La solicitud "${requestTitle}" ya fue contratada y tu propuesta no fue seleccionada.`,
          "info",
          `/freelancer/requests`
        );
      }
    } catch (notifyErr) {
      console.error("Error creando notificaciones en acceptProposal:", notifyErr);
    }

    res.json({
      message: "Propuesta aceptada, proyecto y chat creados.",
      project_id: project.id,
      conversation_id: conversation.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al aceptar propuesta:", err);
    res.status(500).json({ error: "Error al aceptar propuesta" });
  } finally {
    client.release();
  }
};

/**
 * Enviar propuesta a una service_request
 * requestId = service_request_id
 */
exports.sendProposal = async (req, res) => {
  const { requestId } = req.params; // este es service_request_id
  const freelancerId = req.user.id;
  const {
    message,
    proposed_price,
    proposed_deadline,
    estimated_days,
    scope,
  } = req.body;

  try {
    // 0) Obtener la service_request para saber el cliente y el servicio
    const reqRes = await pool.query(
      `
      SELECT 
        sr.id,
        sr.client_id,
        s.title
      FROM service_requests sr
      LEFT JOIN services s 
        ON s.id = sr.service_id
      WHERE sr.id = $1
      `,
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const serviceRequest = reqRes.rows[0];

    // 1) Verificar si ya existe propuesta de este freelancer
    const existing = await pool.query(
      `
      SELECT * 
      FROM proposals 
      WHERE request_id = $1 AND freelancer_id = $2
      `,
      [requestId, freelancerId]
    );

    if (existing.rowCount > 0) {
      // 🔔 Notificación al freelancer por intento duplicado
      try {
        await createNotificationForUser(
          freelancerId,
          "Ya has enviado una propuesta a esta solicitud. Puedes gestionar tus propuestas desde 'Mis propuestas'.",
          "warning",
          `/my-proposals` // ajusta a tu ruta real
        );
      } catch (notifyErr) {
        console.error(
          "Error creando notificación en sendProposal (duplicado):",
          notifyErr
        );
      }

      return res
        .status(400)
        .json({ error: "Ya has enviado una propuesta a esta solicitud." });
    }

    // 2) Crear propuesta
    const result = await pool.query(
      `
      INSERT INTO proposals (
         request_id,          -- ahora apunta a service_requests.id
         freelancer_id,
         message,
         proposed_price,
         proposed_deadline,
         estimated_days,
         scope,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *
      `,
      [
        requestId,
        freelancerId,
        message,
        proposed_price,
        proposed_deadline,
        estimated_days || null,
        scope || null,
      ]
    );

    const proposal = result.rows[0];

    // 🔔 3) Notificación al cliente: nueva propuesta recibida
    try {
      const title = serviceRequest.title || "tu solicitud";
      await createNotificationForUser(
        serviceRequest.client_id,
        `Has recibido una nueva propuesta para "${title}".`,
        "info",
        `/my-requests` // ruta donde el cliente ve sus solicitudes
      );
    } catch (notifyErr) {
      console.error("Error creando notificación en sendProposal:", notifyErr);
    }

    res.status(201).json(proposal);
  } catch (err) {
    console.error("Error sending proposal:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
