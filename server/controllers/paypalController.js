// server/controllers/paypalController.js
const paypalService = require('../services/paypalService');
const pool = require('../config/db');
const { createNotificationForUser } = require("./notificationController");

exports.createOrderController = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  try {
    // Obtener info del proyecto + monto
    const { rows } = await pool.query(
      `
      SELECT 
        p.id,
        p.client_id,
        p.freelancer_id,
        p.status,
        p.contract_price,
        p.client_accepted,
        p.freelancer_accepted,
        COALESCE(
          p.contract_price,        -- siempre manda primero lo pactado en contrato
          pr.proposed_price,       -- si vino de una propuesta
          sr.proposed_budget,      -- si fue una solicitud de servicio con presupuesto
          s.price                  -- precio fijo del servicio publicado
        ) AS amount
      FROM projects p
      LEFT JOIN services s 
        ON s.id = p.service_id
      LEFT JOIN service_requests sr 
        ON sr.id = p.service_request_id
      LEFT JOIN proposals pr 
        ON pr.id = p.proposal_id
       AND pr.status = 'accepted'
      WHERE p.id = $1
        AND p.client_id = $2
      `,
      [projectId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const project = rows[0];

    // Debe estar listo para pago
    if (
      project.status !== "awaiting_payment" &&
      project.status !== "pending_contract" // compatibilidad con proyectos viejos
    ) {
      await createNotificationForUser(
        userId,
        "Intentaste realizar un pago, pero el proyecto todavía no está listo para pagar.",
        "warning",
        `/projects/${projectId}`
      );

      return res.status(400).json({
        error: "El proyecto todavía no está listo para pagar.",
      });
    }

    // Deben haber aceptado contrato ambas partes
    if (!project.client_accepted || !project.freelancer_accepted) {
      await createNotificationForUser(
        userId,
        "El contrato aún no está aceptado por ambas partes. Revisa los términos antes de pagar.",
        "warning",
        `/projects/${projectId}`
      );

      return res.status(400).json({
        error: "El contrato debe estar aceptado por ambas partes antes del pago.",
      });
    }

    const amount = project.contract_price ?? project.amount;
    if (!amount || Number(amount) <= 0) {
      await createNotificationForUser(
        userId,
        "No se pudo iniciar el pago porque el proyecto no tiene un monto definido.",
        "error",
        `/projects/${projectId}`
      );

      return res.status(400).json({
        error: "El proyecto no tiene un monto de contrato definido.",
      });
    }

    const orderId = await paypalService.createOrder(amount);

    await createNotificationForUser(
      userId,
      "Se inició el proceso de pago con PayPal para tu proyecto.",
      "info",
      `/projects/${projectId}`
    );

    res.json({ id: orderId });
  } catch (err) {
    console.error("Error creating PayPal order:", err.message);

    try {
      await createNotificationForUser(
        req.user.id,
        "Ocurrió un error al iniciar el pago con PayPal. Inténtalo de nuevo más tarde.",
        "error",
        `/projects/${req.params.projectId}`
      );
    } catch (notifyErr) {
      console.error(
        "Error creando notificación en createOrderController:",
        notifyErr
      );
    }

    res.status(500).json({ error: err.message });
  }
};

exports.captureOrderController = async (req, res) => {
  const { orderID, projectId } = req.body;
  const userId = req.user.id; // cliente que está confirmando el pago

  try {
    const status = await paypalService.captureOrder(orderID);

    if (status === "COMPLETED") {
      // Obtener info del proyecto para validar estado y notificar
      const { rows } = await pool.query(
        `SELECT id, client_id, freelancer_id, status FROM projects WHERE id = $1`,
        [projectId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }

      const project = rows[0];

      if (
        project.status !== 'awaiting_payment' &&
        project.status !== 'pending_contract'
      ) {
        return res.status(400).json({
          error: "El proyecto no está en un estado válido para iniciar tras el pago.",
        });
      }

      // Actualizar proyecto como en progreso
      await pool.query(
        `
        UPDATE projects
        SET status = 'in_progress',
            contract_accepted_at = NOW(),
            started_at = COALESCE(started_at, NOW())
        WHERE id = $1
        `,
        [projectId]
      );

      // 🔔 Notificaciones después de pago exitoso
      try {
        // Cliente
        await createNotificationForUser(
          project.client_id,
          "Tu pago se ha procesado correctamente. El proyecto ahora está en progreso.",
          "success",
          `/projects/${projectId}`
        );

        // Freelancer
        await createNotificationForUser(
          project.freelancer_id,
          "El cliente ha realizado el pago. El proyecto ahora está en progreso y puedes continuar con el trabajo.",
          "info",
          `/projects/${projectId}`
        );
      } catch (notifyErr) {
        console.error("Error creando notificaciones tras pago exitoso:", notifyErr);
      }

      res.json({ message: "Pago exitoso y proyecto iniciado." });
    } else {
      // Pago no completado
      // 🔔 Notificación de fallo al cliente
      try {
        await createNotificationForUser(
          userId,
          "El pago con PayPal no se completó. Puedes intentarlo de nuevo desde el proyecto.",
          "warning",
          `/projects/${projectId}`
        );
      } catch (notifyErr) {
        console.error("Error creando notificación de pago no completado:", notifyErr);
      }

      res.status(400).json({ error: "Pago no completado" });
    }
  } catch (err) {
    console.error('Error capturing PayPal order:', err.message);

    // 🔔 Notificación de error técnico al cliente
    try {
      await createNotificationForUser(
        userId,
        "Ocurrió un error al confirmar el pago con PayPal. Si el cargo aparece en tu cuenta, contacta soporte.",
        "error",
        `/projects/${projectId}`
      );
    } catch (notifyErr) {
      console.error("Error creando notificación en captureOrderController:", notifyErr);
    }

    res.status(500).json({ error: err.message });
  }
};
