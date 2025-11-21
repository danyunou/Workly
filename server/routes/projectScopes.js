// server/routes/projectScopes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const projectScopeController = require("../controllers/projectScopeController");

// Obtener scope actual de un proyecto
router.get(
  "/projects/:projectId/current",
  authMiddleware,
  projectScopeController.getCurrentScope
);

// Obtener historial de scopes
router.get(
  "/projects/:projectId/history",
  authMiddleware,
  projectScopeController.getHistory
);

// Crear una nueva versión de scope
router.post(
  "/projects/:projectId",
  authMiddleware,
  projectScopeController.createNewScopeVersion
);

module.exports = router;
