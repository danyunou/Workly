// server/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.registerUser);
router.post("/send-verification", authController.resendVerification);
router.get("/verify", authController.verifyAccount);

router.post('/login', authController.login);

module.exports = router;
