//routes/serviceRequests.js
const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, serviceRequestController.createServiceRequest);
router.get('/freelancer', authMiddleware, serviceRequestController.getRequestsForFreelancer);

module.exports = router;
