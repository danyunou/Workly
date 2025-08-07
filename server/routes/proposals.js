const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const authMiddleware = require('../middleware/authMiddleware');
const ensureFreelancer = require("../middleware/ensureFreelancer");

// Obtener propuestas de una solicitud específica
router.get('/by-request/:requestId', authMiddleware, proposalController.getProposalsByRequest);

// Aceptar una propuesta y generar proyecto
router.post('/accept/:proposalId', authMiddleware, proposalController.acceptProposal);

router.post("/send/:requestId", authMiddleware, ensureFreelancer, proposalController.sendProposal);

module.exports = router;
