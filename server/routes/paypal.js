const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const paypalController = require("../controllers/paypalController");

router.post("/create-order/:projectId", authMiddleware, paypalController.createOrderController);
router.post("/capture-order", authMiddleware, paypalController.captureOrderController);

module.exports = router;
