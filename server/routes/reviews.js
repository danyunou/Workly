const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const reviewController = require("../controllers/reviewController");

// Crear una reseña
router.post("/", auth, reviewController.createUserReview);

// Obtener todas las reseñas de un usuario (clientes o freelancers)
router.get("/:userId", reviewController.getReviewsForUser);

module.exports = router;
