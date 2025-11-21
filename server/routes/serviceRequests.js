// routes/serviceRequests.js
const express = require("express");
const router = express.Router();

const serviceRequestController = require("../controllers/serviceRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const ensureFreelancer = require("../middleware/ensureFreelancer");
const ensureClient = require("../middleware/ensureClient");

// Crear solicitud de servicio (cliente -> freelancer)
router.post(
  "/",
  authMiddleware,
  ensureClient,
  serviceRequestController.createServiceRequest
);

// Solicitudes para el freelancer dueño del servicio
router.get(
  "/freelancer",
  authMiddleware,
  ensureFreelancer,
  serviceRequestController.getRequestsForFreelancer
);

// Solicitudes que ha enviado el cliente a servicios
router.get(
  "/by-client",
  authMiddleware,
  ensureClient,
  serviceRequestController.getRequestsByClient
);

// Rechazar solicitud (freelancer)
router.post(
  "/:id/reject",
  authMiddleware,
  ensureFreelancer,
  serviceRequestController.rejectServiceRequest
);

// Reenviar solicitud rechazada (cliente)
router.post(
  "/:id/resend",
  authMiddleware,
  ensureClient,
  serviceRequestController.resendServiceRequest
);

module.exports = router;
