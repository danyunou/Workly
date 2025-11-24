// server/controllers/scopeController.js
const pool = require("../config/db");
const { createNotificationForUser } = require("./notificationController");

// GET /api/projects/:projectId/scope/current
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
      // ⛔️ No hay scope aún → 404 controlado
      return res.status(404).json({ error: "No hay scope para este proyecto" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener scope actual:", error);
    res.status(500).json({ error: "Error al obtener scope actual" });
  }
};

// GET /api/projects/:projectId/scope/history
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

    // Aquí SIEMPRE devolvemos 200, aunque sea []
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener historial de scopes:", error);
    res.status(500).json({ error: "Error al obtener historial de scopes" });
  }
};

// POST /api/projects/:projectId/scope
exports.createNewScopeVersion = async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    deliverables,
    exclusions,
    revision_limit,
    // estos dos se usan SOLO para actualizar el contrato,
    // ya no se guardan en project_scopes
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

    // 2) Crear nueva versión (SIN price/deadline)
    const scopeRes = await client.query(
      `INSERT INTO project_scopes (
        project_id,
        version,
        title,
        description,
        deliverables,
        exclusions,
        revision_limit,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        projectId,
        newVersion,
        title,
        description,
        deliverables,
        exclusions,
        revision_limit,
        userId,
      ]
    );

    // 3) Resetear aceptaciones de contrato y actualizar monto/fecha SI vienen
    const projRes = await client.query(
      `UPDATE projects
       SET client_accepted = FALSE,
           freelancer_accepted = FALSE,
           contract_price = COALESCE($2, contract_price),
           contract_deadline = COALESCE($3::date, contract_deadline),
           updated_at = NOW()
       WHERE id = $1
       RETURNING client_id, freelancer_id`,
      [projectId, price, deadline]
    );

    const project = projRes.rows[0];

    // 4) Mensaje de sistema en el chat
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

    // 5) Notificaciones
    try {
      const isClient = userId === project.client_id;
      const actorLabel = isClient ? "El cliente" : "El freelancer";

      const message =
        `${actorLabel} creó la versión ${newVersion} del alcance del proyecto. ` +
        `Es necesario revisar y aceptar nuevamente el contrato.`;

      await createNotificationForUser(
        project.client_id,
        message,
        "info",
        `/projects/${projectId}`
      );

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
    res.status(500).json({ error: "Error al crear nueva versión de scope" });
  } finally {
    client.release();
  }
};