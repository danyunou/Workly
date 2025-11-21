// server/routes/notifications.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// Todas las rutas requieren usuario autenticado
router.get(
  "/",
  authMiddleware,
  notificationController.getMyNotifications
);

router.post(
  "/",
  authMiddleware,
  notificationController.createNotification
);

router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markAsRead
);

router.patch(
  "/mark-all-read",
  authMiddleware,
  notificationController.markAllAsRead
);

module.exports = router;
