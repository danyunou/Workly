const paypalService = require('../services/paypalService');
const pool = require('../config/db');

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
        p.status,
        p.contract_price,
        p.client_accepted,
        p.freelancer_accepted,
        COALESCE(
          p.contract_price,
          s.price,
          r.budget,
          pr.proposed_price,
          sr.proposed_budget
        ) AS amount
      FROM projects p
      LEFT JOIN services s ON s.id = p.service_id
      LEFT JOIN requests r ON r.id = p.request_id
      LEFT JOIN service_requests sr ON sr.id = p.service_request_id
      LEFT JOIN proposals pr 
        ON pr.request_id = r.id 
       AND pr.freelancer_id = p.freelancer_id 
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

    // Debe estar listo para pago (nuevo flujo = awaiting_payment)
    if (
      project.status !== 'awaiting_payment' &&
      project.status !== 'pending_contract' // compatibilidad con proyectos viejos
    ) {
      return res.status(400).json({
        error: "El proyecto todavía no está listo para pagar.",
      });
    }

    // Deben haber aceptado contrato ambas partes
    if (!project.client_accepted || !project.freelancer_accepted) {
      return res.status(400).json({
        error: "El contrato debe estar aceptado por ambas partes antes del pago.",
      });
    }

    const amount = project.contract_price ?? project.amount;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: "El proyecto no tiene un monto de contrato definido.",
      });
    }

    const orderId = await paypalService.createOrder(amount);
    res.json({ id: orderId });
  } catch (err) {
    console.error('Error creating PayPal order:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.captureOrderController = async (req, res) => {
  const { orderID, projectId } = req.body;

  try {
    const status = await paypalService.captureOrder(orderID);

    if (status === "COMPLETED") {
      // Opcional: validar que esté awaiting_payment antes de marcarlo en progreso
      const { rows } = await pool.query(
        `SELECT status FROM projects WHERE id = $1`,
        [projectId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }

      if (rows[0].status !== 'awaiting_payment' &&
          rows[0].status !== 'pending_contract') {
        return res.status(400).json({
          error: "El proyecto no está en un estado válido para iniciar tras el pago.",
        });
      }

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

      res.json({ message: "Pago exitoso y proyecto iniciado." });
    } else {
      res.status(400).json({ error: "Pago no completado" });
    }
  } catch (err) {
    console.error('Error capturing PayPal order:', err.message);
    res.status(500).json({ error: err.message });
  }
};
