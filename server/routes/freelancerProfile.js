const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const freelancerController = require('../controllers/freelancerController');
const authMiddleware = require('../middleware/authMiddleware');
const requestController = require('../controllers/requestController');

// ✅ Crear perfil de freelancer con archivos
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

// routes/requestRoutes.js
router.get("/by-freelancer", authMiddleware, requestController.getRequestsForFreelancer);

// Actualizar perfil del freelancer (nueva ruta)
router.put('/update', authMiddleware, freelancerController.updateFreelancerProfile);
console.log("✅ Ruta /api/freelancerProfile/update registrada");

// Perfil público por username (SIN auth)
router.get('/public/:username', freelancerController.getPublicFreelancerProfile);

router.put("/portfolio", authMiddleware, freelancerController.updatePortfolio);
router.post(
  "/portfolio/image",
  authMiddleware,
  upload.single("image"),
  freelancerController.uploadPortfolioImage
);

module.exports = router;
