const express = require('express');
const router = express.Router();
const freelancerController = require('../controllers/freelancerController');
const authMiddleware = require('../middleware/authMiddleware');

// Crear perfil de freelancer
router.post('/', authMiddleware, freelancerController.createFreelancerProfile);

// Obtener estado de verificación
router.get('/status', authMiddleware, freelancerController.getVerificationStatus);

// ✅ Obtener perfil del freelancer (asegúrate que esta línea esté bien escrita)
router.get('/profile', authMiddleware, freelancerController.getFreelancerProfile);

module.exports = router;
