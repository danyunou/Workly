// routes/serviceRequests.js
const express = require("express");
const router = express.Router();

const serviceRequestController = require("../controllers/serviceRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const ensureFreelancer = require("../middleware/ensureFreelancer");

// Crear solicitud de servicio (cliente -> freelancer)
router.post(
  "/",
  authMiddleware,
  serviceRequestController.createServiceRequest
);

// Solicitudes para el freelancer dueño del servicio
router.get(
  "/freelancer",
  authMiddleware,
  ensureFreelancer,
  serviceRequestController.getRequestsForFreelancer
);

// Solicitudes que HA ENVIADO el cliente
router.get(
  "/by-client",
  authMiddleware,
  serviceRequestController.getRequestsByClient
);

// Rechazar solicitud (solo freelancer)
router.post(
  "/:id/reject",
  authMiddleware,
  ensureFreelancer,
  serviceRequestController.rejectServiceRequest
);

// Reenviar solicitud rechazada (solo cliente)
router.post(
  "/:id/resend",
  authMiddleware,
  serviceRequestController.resendServiceRequest
);

module.exports = router;
