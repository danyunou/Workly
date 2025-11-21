// server/routes/conversations.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const conversationController = require("../controllers/conversationController");

// Chat de solicitudes de servicio
router.get(
  "/by-service-request/:requestId",
  authMiddleware,
  conversationController.getByServiceRequest
);

// Chat de proyectos
router.get(
  "/by-project/:projectId",
  authMiddleware,
  conversationController.getByProject
);

// Obtener mensajes de una conversación
router.get(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.getMessages
);

// Enviar mensaje en una conversación
router.post(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.postMessage
);

module.exports = router;