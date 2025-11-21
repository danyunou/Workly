// server/routes/conversations.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const conversationController = require("../controllers/conversationController");

// Obtener conversación por service_request
router.get(
  "/by-service-request/:id",
  authMiddleware,
  conversationController.getByServiceRequest
);

// Obtener conversación por project
router.get(
  "/by-project/:id",
  authMiddleware,
  conversationController.getByProject
);

// Obtener mensajes de una conversación
router.get(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.getMessages
);

// Enviar mensaje (texto)
router.post(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.postMessage
);

module.exports = router;
