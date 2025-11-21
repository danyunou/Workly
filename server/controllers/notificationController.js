// server/controllers/notificationController.js
const pool = require("../config/db");

// Obtener notificaciones del usuario autenticado
exports.getMyNotifications = async (req, res) => {
  const userId = req.user.id;
  const { onlyUnread } = req.query;

  try {
    const params = [userId];
    let query = `
      SELECT id, type, message, link, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (onlyUnread === "true") {
      params.push(false);
      query += " AND is_read = $2";
    }

    query += " ORDER BY created_at DESC LIMIT 100";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener notificaciones:", err);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
};

// Crear una notificación para el usuario autenticado (útil para pruebas o acciones simples)
exports.createNotification = async (req, res) => {
  const userId = req.user.id;
  const { message, type = "info", link = null } = req.body;

  if (!message) {
    return res.status(400).json({ error: "El mensaje es obligatorio" });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO notifications (user_id, type, message, link)
      VALUES ($1, $2, $3, $4)
      RETURNING id, type, message, link, is_read, created_at
      `,
      [userId, type, message, link]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error al crear notificación:", err);
    res.status(500).json({ error: "Error al crear notificación" });
  }
};

// Marcar una notificación como leída
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { rowCount, rows } = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, type, message, link, is_read, created_at
      `,
      [id, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error al marcar como leída:", err);
    res.status(500).json({ error: "Error al marcar notificación como leída" });
  }
};

// Marcar todas como leídas
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      `,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error al marcar todas como leídas:", err);
    res.status(500).json({ error: "Error al marcar todas las notificaciones como leídas" });
  }
};

exports.createNotificationForUser = async (userId, message, type = "info", link = null) => {
  try {
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, message, link)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, type, message, link]
    );
  } catch (err) {
    console.error("Error al crear notificación (helper):", err);
    // no re-lanzamos para no romper el flujo principal
  }
};
