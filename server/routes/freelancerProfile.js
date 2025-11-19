// server/routes/freelancerProfile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const freelancerController = require('../controllers/freelancerController');
const authMiddleware = require('../middleware/authMiddleware');
const requestController = require('../controllers/requestController');

// ✅ Crear perfil de freelancer con archivos (foto + verificación)
router.post(
  '/',
  authMiddleware,
  upload.fields([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'verification_file', maxCount: 1 }
  ]),
  freelancerController.createFreelancerProfile
);

// Obtener estado de verificación
router.get('/status', authMiddleware, freelancerController.getVerificationStatus);

// Obtener perfil del freelancer
router.get('/profile', authMiddleware, freelancerController.getFreelancerProfile);

// Solicitudes por freelancer
router.get("/by-freelancer", authMiddleware, requestController.getRequestsForFreelancer);

// ✅ Actualizar datos del perfil del freelancer (SIN imagen, JSON)
router.put(
  '/update',
  authMiddleware,
  freelancerController.updateFreelancerProfile
);
console.log("✅ Ruta /api/freelancerProfile/update registrada");

// ✅ Actualizar SOLO la foto de perfil (imagen en tabla users.profile_picture)
router.put(
  '/avatar',
  authMiddleware,
  upload.single('profile_picture'),
  freelancerController.updateFreelancerAvatar
);
console.log("✅ Ruta /api/freelancerProfile/avatar registrada");

// Perfil público por username (SIN auth)
router.get('/public/:username', freelancerController.getPublicFreelancerProfile);

// Actualizar portafolio
router.put("/portfolio", authMiddleware, freelancerController.updatePortfolio);

module.exports = router;
