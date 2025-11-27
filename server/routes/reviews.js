const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getProjectReviews,
  createProjectReview,
  createUserReview,
  getReviewsForUser,
} = require("../controllers/reviewController");

router.get(
  "/projects/:projectId/reviews",
  authMiddleware,
  getProjectReviews
);

router.post(
  "/projects/:projectId/reviews",
  authMiddleware,
  createProjectReview 
);

router.post(
  "/reviews",
  authMiddleware,
  createUserReview
);


module.exports = router;
