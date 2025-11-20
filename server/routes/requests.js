//routes/requests.js
const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middleware/authMiddleware");
const ensureFreelancer = require("../middleware/ensureFreelancer");
const { acceptServiceRequest } = require("../controllers/serviceController");

router.get(
  "/by-freelancer",
  authMiddleware,
  ensureFreelancer,
  requestController.getRequestsForFreelancer
);

router.post(
  "/create",
  authMiddleware,
  requestController.createRequest
);

router.get("/by-client", authMiddleware, requestController.getRequestsByClient);

// Aceptar solicitud de contratación y crear proyecto
router.post(
  "/accept-service-request/:requestId",
  authMiddleware,
  ensureFreelancer,
  acceptServiceRequest
);

module.exports = router;
