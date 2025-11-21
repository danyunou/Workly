// server/routes/conversations.js
const express = require("express");
const router = express.Router();

const conversationController = require("../controllers/conversationController");
const authMiddleware = require("../middleware/authMiddleware");

// Conversación ligada a una solicitud de servicio
router.get(
  "/by-service-request/:id",
  authMiddleware,
  conversationController.getByServiceRequest
);

// Conversación (get o create) ligada a un proyecto
router.get(
  "/by-project/:projectId",
  authMiddleware,
  conversationController.getByProject
);

// Mensajes de una conversación
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