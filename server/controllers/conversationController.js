// server/controllers/conversationController.js
const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

// 🔹 Obtener conversación por service_request (si existe)
exports.getByServiceRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM conversations WHERE service_request_id = $1`,
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "No se encontró conversación" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    res.status(500).json({ error: "Error al obtener conversación" });
  }
};

// 🔹 Obtener o crear conversación ligada a un proyecto
exports.getByProject = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const userId = req.user?.id || null;

  try {
    // 1) Buscar conversación existente
    const existing = await pool.query(
      `SELECT * FROM conversations WHERE project_id = $1`,
      [projectId]
    );

    if (existing.rows.length) {
      return res.json(existing.rows[0]);
    }

    // 2) Obtener datos del proyecto y participantes
    const projectRes = await pool.query(
      `SELECT id, client_id, freelancer_id
       FROM projects
       WHERE id = $1`,
      [projectId]
    );

    if (!projectRes.rows.length) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const project = projectRes.rows[0];

    // 3) Si tenemos userId, validamos que sea participante
    if (
      userId &&
      userId !== project.client_id &&
      userId !== project.freelancer_id
    ) {
      return res.status(403).json({
        error: "No estás autorizado para ver esta conversación del proyecto",
      });
    }

    // 4) Crear la conversación
    const insert = await pool.query(
      `INSERT INTO conversations (
         project_id,
         service_request_id,
         client_id,
         freelancer_id,
         created_by,
         created_at
       )
       VALUES ($1, NULL, $2, $3, $4, NOW())
       RETURNING *`,
      [projectId, project.client_id, project.freelancer_id, userId]
    );

    return res.status(201).json(insert.rows[0]);
  } catch (error) {
    console.error("Error en getByProject (get/crear):", error);
    res
      .status(500)
      .json({ error: "Error al obtener/crear conversación" });
  }
};

// 🔹 Obtener mensajes de una conversación
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?.id; // viene del authMiddleware

  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    // 🔹 Marcar como leídos los mensajes del otro usuario al abrir la conversación
    if (userId) {
      try {
        await pool.query(
          `UPDATE messages
           SET is_read = TRUE
           WHERE conversation_id = $1
             AND sender_id <> $2
             AND is_read = FALSE`,
          [conversationId, userId]
        );
      } catch (err) {
        console.error(
          "Error al marcar mensajes como leídos (getMessages):",
          err
        );
        // No rompemos la respuesta al cliente por esto
      }
    }

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
};

// 🔹 Enviar mensaje en una conversación
exports.postMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const sender_id = req.user.id;

  if (!content || !content.trim()) {
    return res
      .status(400)
      .json({ error: "El mensaje no puede estar vacío" });
  }

  try {
    // 1️⃣ Verificar que la conversación exista + estado del proyecto (si aplica)
    const convoRes = await pool.query(
      `SELECT 
         c.id,
         c.client_id,
         c.freelancer_id,
         c.project_id,
         c.service_request_id,
         p.status AS project_status
       FROM conversations c
       LEFT JOIN projects p ON p.id = c.project_id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (!convoRes.rows.length) {
      return res
        .status(404)
        .json({ error: "La conversación no existe" });
    }

    const conversation = convoRes.rows[0];

    // 1.1️⃣ Validar que el usuario pertenezca a la conversación
    if (
      sender_id !== conversation.client_id &&
      sender_id !== conversation.freelancer_id
    ) {
      return res.status(403).json({
        error:
          "No estás autorizado para enviar mensajes en esta conversación",
      });
    }

    // 1.2️⃣ Si está ligada a un proyecto completado/cancelado, bloquear mensajes
    if (
      conversation.project_status &&
      ["completed", "cancelled"].includes(conversation.project_status)
    ) {
      return res.status(409).json({
        error:
          "El chat está cerrado porque el proyecto ya fue completado o cancelado.",
      });
    }

    // 2️⃣ Insertar el mensaje
    const { rows } = await pool.query(
      `INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        type,
        is_read,
        created_at
      )
      VALUES ($1, $2, $3, 'user', FALSE, NOW())
      RETURNING *`,
      [conversationId, sender_id, content.trim()]
    );

    const message = rows[0];

    // 3️⃣ Notificar al otro usuario
    try {
      const targetUserId =
        sender_id === conversation.client_id
          ? conversation.freelancer_id
          : conversation.client_id;

      if (targetUserId) {
        // Preview corto del mensaje
        const preview =
          content.length > 80
            ? content.slice(0, 77).trimEnd() + "..."
            : content;

        // Ruta de detalle: proyecto o solicitudes
        let link = null;
        if (conversation.project_id) {
          link = `/projects/${conversation.project_id}`;
        } else if (conversation.service_request_id) {
          link = `/my-requests`;
        }

        await createNotificationForUser(
          targetUserId,
          `Tienes un nuevo mensaje: "${preview}"`,
          "info",
          link
        );
      }
    } catch (notifyError) {
      console.error(
        "Error al crear notificación de nuevo mensaje:",
        notifyError
      );
      // No rompemos el flujo principal si falla la notificación
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
};