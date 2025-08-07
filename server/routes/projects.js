const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const projectController = require("../controllers/projectController");
const multer = require("multer");
const upload = multer();

router.get("/my-projects", authMiddleware, projectController.getMyProjects);

router.get("/:id", authMiddleware, projectController.getProjectById);

router.post('/:id/accept', authMiddleware, projectController.acceptContract);

router.post(
  "/upload-deliverable",
  authMiddleware,
  upload.single("deliverable"),
  projectController.uploadDeliverable
);

router.get("/:id/deliverables", authMiddleware, projectController.getDeliverables);

router.post("/deliverables/:deliverableId/approve", authMiddleware, projectController.approveDeliverable);
router.post("/:projectId/approve", authMiddleware, projectController.approveProject);
router.post("/deliverables/:deliverableId/reject", authMiddleware, projectController.rejectDeliverable);

module.exports = router;
