const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // para usar con S3

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Obtener perfil
router.get('/profile', authMiddleware, userController.getUserProfile);

// Actualizar perfil (con imagen opcional)
router.put(
  '/profile',
  authMiddleware,
  upload.fields([{ name: 'profile_picture', maxCount: 1 }]),
  userController.updateUserProfile
);

module.exports = router;
