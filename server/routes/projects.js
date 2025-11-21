// server/routes/projects.js
const express = require("express");
const router = express.Router();

const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const ensureFreelancer = require("../middleware/ensureFreelancer");

const multer = require("multer");
const upload = multer(); // memoria

// ⚠️ IMPORTANTE: rutas más específicas primero, luego las genéricas

// Listado de proyectos del usuario (cliente o freelancer)
router.get(
  "/my-projects",
  authMiddleware,
  projectController.getMyProjects
);

// Subida de entregables (freelancer)
router.post(
  "/upload-deliverable",
  authMiddleware,
  ensureFreelancer,
  upload.single("deliverable"),
  projectController.uploadDeliverable
);

// Aprobar / rechazar entregables (cliente)
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

// Crear proyecto desde service_request (freelancer)
router.post(
  "/from-service-request",
  authMiddleware,
  ensureFreelancer,
  projectController.createProjectFromServiceRequest
);

// Crear proyecto desde propuesta aceptada
router.post(
  "/from-proposal",
  authMiddleware,
  projectController.createProjectFromProposal
);

// Alcance (scope) del proyecto
router.get(
  "/:projectId/scope/current",
  authMiddleware,
  projectController.getCurrentScope
);

router.get(
  "/:projectId/scope/history",
  authMiddleware,
  projectController.getHistory
);

router.post(
  "/:projectId/scope",
  authMiddleware,
  projectController.createNewScopeVersion
);

// Aprobar proyecto (cliente)
router.post(
  "/:projectId/approve",
  authMiddleware,
  projectController.approveProject
);

// Entregables del proyecto
router.get(
  "/:id/deliverables",
  authMiddleware,
  projectController.getDeliverables
);

// Aceptar contrato
router.post(
  "/:id/accept",
  authMiddleware,
  projectController.acceptContract
);

// Actualizar contrato
router.patch(
  "/:id/contract",
  authMiddleware,
  projectController.updateContract
);

// Detalle de proyecto
router.get("/:id", authMiddleware, projectController.getProjectById);

module.exports = router;