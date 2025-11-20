const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ensureFreelancer = require("../middleware/ensureFreelancer");
const controller = require("../controllers/serviceRequestController");

router.post("/", auth, controller.createServiceRequest);

router.get("/freelancer", auth, ensureFreelancer, controller.getRequestsForFreelancer);

router.post("/:id/reject", auth, ensureFreelancer, controller.rejectServiceRequest);

router.put("/:id/resend", auth, controller.resendServiceRequest);

module.exports = router;