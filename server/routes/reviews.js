// server/routes/reviews.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const reviewController = require("../controllers/reviewController");

// GET /api/projects/:projectId/reviews
router.get(
  "/:projectId/reviews",
  authMiddleware,
  reviewController.getProjectReviews
);

// POST /api/projects/:projectId/reviews
router.post(
  "/:projectId/reviews",
  authMiddleware,
  reviewController.createProjectReview
);

module.exports = router;
