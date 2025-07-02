const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

// POST /api/paypal/create-order
router.post('/paypal/create-order', paypalController.createOrderController);

// POST /api/paypal/capture-order
router.post('/paypal/capture-order', paypalController.captureOrderController);

module.exports = router;
