// server/routes/conversations.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const conversationController = require("../controllers/conversationController");

// Chat de solicitudes de servicio
router.get(
  "/by-service-request/:requestId",
  authMiddleware,
  conversationController.getOrCreateByServiceRequest
);

// Chat de proyectos
router.get(
  "/by-project/:projectId",
  authMiddleware,
  conversationController.getOrCreateByProject
);

// Mensajes
router.get(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.getMessages
);

router.post(
  "/:conversationId/messages",
  authMiddleware,
  conversationController.postMessage
);

module.exports = router;
