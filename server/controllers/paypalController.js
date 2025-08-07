const paypalService = require('../services/paypalService');
const pool = require('../config/db');

exports.createOrderController = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  try {
    // Obtener el monto del proyecto
    const { rows } = await pool.query(
      `SELECT 
         COALESCE(s.price, r.budget, pr.proposed_price, sr.proposed_budget) AS amount
       FROM projects p
       LEFT JOIN services s ON s.id = p.service_id
       LEFT JOIN requests r ON r.id = p.request_id
       LEFT JOIN service_requests sr ON sr.id = p.service_request_id
       LEFT JOIN proposals pr ON pr.request_id = r.id AND pr.freelancer_id = p.freelancer_id AND pr.status = 'accepted'
       WHERE p.id = $1 AND p.client_id = $2`,
      [projectId, userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Proyecto no encontrado" });

    const amount = rows[0].amount;
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
      await pool.query(
        `UPDATE projects SET status = 'in_progress', contract_accepted_at = NOW()
         WHERE id = $1`,
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
