const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const uploadController = require('../controllers/uploadController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, upload.single('file'), uploadController.uploadSingleFile);

module.exports = router;
