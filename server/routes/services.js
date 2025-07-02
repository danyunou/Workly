const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', serviceController.getAllServices);

// 🔐 Solo usuarios autenticados pueden crear servicios
router.post('/', authMiddleware, serviceController.createService);
router.get('/by-category', serviceController.getServicesByCategory);

module.exports = router;
