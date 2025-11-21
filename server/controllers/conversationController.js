// server/controllers/conversationController.js
const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

exports.getByServiceRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM conversations WHERE service_request_id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No se encontró conversación" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    res.status(500).json({ error: "Error al obtener conversación" });
  }
};

exports.getByProject = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM conversations WHERE project_id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No se encontró conversación" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    res.status(500).json({ error: "Error al obtener conversación" });
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?.id; // debería venir del authMiddleware

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

exports.postMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const sender_id = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío" });
  }

  try {
    // 1️⃣ Verificar que la conversación exista y que el usuario pertenece a ella
    const convoRes = await pool.query(
      `SELECT id, client_id, freelancer_id, project_id, service_request_id
       FROM conversations
       WHERE id = $1`,
      [conversationId]
    );

    if (!convoRes.rows.length) {
      return res.status(404).json({ error: "La conversación no existe" });
    }

    const conversation = convoRes.rows[0];

    if (
      sender_id !== conversation.client_id &&
      sender_id !== conversation.freelancer_id
    ) {
      return res.status(403).json({
        error: "No estás autorizado para enviar mensajes en esta conversación",
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
      [conversationId, sender_id, content]
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
          // Ajusta esta ruta si tienes una vista específica para el chat de solicitudes
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
      console.error("Error al crear notificación de nuevo mensaje:", notifyError);
      // No rompemos el flujo principal si falla la notificación
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
};
