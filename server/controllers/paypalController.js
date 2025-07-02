// server/controllers/paypalController.js
const { createOrder, captureOrder } = require('../services/paypalService');

exports.createOrderController = async (req, res) => {
  const { value } = req.body;

  try {
    const id = await createOrder(value);
    res.json({ id });
  } catch (err) {
    console.error('Error creating PayPal order:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.captureOrderController = async (req, res) => {
  const { orderID } = req.body;

  try {
    const status = await captureOrder(orderID);
    res.json({ status });
  } catch (err) {
    console.error('Error capturing PayPal order:', err.message);
    res.status(500).json({ error: err.message });
  }
};
