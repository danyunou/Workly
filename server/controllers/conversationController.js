// server/controllers/conversationController.js
const pool = require("../config/db");

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

  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

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

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
};
