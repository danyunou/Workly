// routes/disputes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const disputeController = require("../controllers/disputeController");

router.post("/", authMiddleware, disputeController.createDispute);
// Obtener disputa por proyecto
router.get("/by-project/:projectId", authMiddleware, disputeController.getDisputeByProject);
router.get("/:id/logs", authMiddleware, disputeController.getDisputeLogs);


module.exports = router;
