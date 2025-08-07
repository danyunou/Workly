const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const ensureAdmin = require("../middleware/ensureAdmin");

// 🛡️ Proteger rutas solo para admins
router.use(authMiddleware, ensureAdmin);

// Verificaciones pendientes
router.get('/verifications', adminController.getPendingVerifications);

// Aprobar o rechazar
router.put('/verifications/:verificationId/approve', adminController.approveVerification);
router.put('/verifications/:verificationId/reject', adminController.rejectVerification);

router.get('/disputes', authMiddleware, ensureAdmin, adminController.getAllDisputes);
router.post("/disputes/:id/accept", authMiddleware, adminController.acceptDispute);
router.post("/disputes/:id/reject", authMiddleware, adminController.rejectDispute);

module.exports = router;
