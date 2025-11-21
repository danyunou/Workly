const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const reviewController = require("../controllers/reviewController");

router.get("/:projectId/reviews", authMiddleware, reviewController.getProjectReviews);
router.post("/:projectId/reviews", authMiddleware, reviewController.createOrUpdateProjectReview);

module.exports = router;
