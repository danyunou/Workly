// server/routes/projects.js
const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const scopeController = require("../controllers/scopeController");
const authMiddleware = require("../middleware/authMiddleware");

// Si usas multer para entregables:
const multer = require("multer");
const upload = multer();

// 🔹 Proyectos del usuario
router.get("/my-projects", authMiddleware, projectController.getMyProjects);

// 🔹 Detalle de un proyecto
router.get("/:id", authMiddleware, projectController.getProjectById);

// 🔹 Aceptar contrato
router.post("/:id/accept", authMiddleware, projectController.acceptContract);

// 🔹 Actualizar contrato
router.patch("/:id/contract", authMiddleware, projectController.updateContract);

// 🔹 Entregables
router.post(
  "/upload-deliverable",
  authMiddleware,
  upload.single("deliverable"),
  projectController.uploadDeliverable
);

router.get(
  "/:id/deliverables",
  authMiddleware,
  projectController.getDeliverables
);

router.post(
  "/deliverables/:deliverableId/approve",
  authMiddleware,
  projectController.approveDeliverable
);

router.post(
  "/deliverables/:deliverableId/reject",
  authMiddleware,
  projectController.rejectDeliverable
);

// 🔹 Aprobar proyecto completo
router.post(
  "/:projectId/approve",
  authMiddleware,
  projectController.approveProject
);

// 🔹 Crear proyecto desde service_request
router.post(
  "/from-service-request",
  authMiddleware,
  projectController.createProjectFromServiceRequest
);

// 🔹 Crear proyecto desde propuesta
router.post(
  "/from-proposal",
  authMiddleware,
  projectController.createProjectFromProposal
);

/* =========================
   SCOPES DEL PROYECTO
   ========================= */

// GET alcance actual
// Front: GET /api/projects/:projectId/scope/current
router.get(
  "/:projectId/scope/current",
  authMiddleware,
  scopeController.getCurrentScope
);

// GET historial de versiones
// Front: GET /api/projects/:projectId/scope/history
router.get(
  "/:projectId/scope/history",
  authMiddleware,
  scopeController.getHistory
);

// POST nueva versión de scope
// Front: POST /api/projects/:projectId/scope
router.post(
  "/:projectId/scope",
  authMiddleware,
  scopeController.createNewScopeVersion
);

module.exports = router;