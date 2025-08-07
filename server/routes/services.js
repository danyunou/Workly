const express = require('express');
const router = express.Router();

const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const ensureFreelancer = require('../middleware/ensureFreelancer');

const multer = require('multer');
const upload = multer(); // Middleware para archivos

// Obtener todos los servicios agrupados por categoría
router.get('/', serviceController.getAllServices);

// Crear un nuevo servicio (solo freelancers autenticados)
router.post('/', authMiddleware, upload.fields([{ name: 'image' }]), serviceController.createService);

// Obtener servicios por categoría
router.get('/category/:category', serviceController.getServicesByCategory);

// Obtener servicios del freelancer autenticado
router.get('/by-freelancer', authMiddleware, ensureFreelancer, serviceController.getServicesByFreelancer);

// Eliminar un servicio
router.delete('/:id', authMiddleware, ensureFreelancer, serviceController.deleteService);

router.put('/:id', authMiddleware, ensureFreelancer, serviceController.updateService);

router.get('/:id/requests', authMiddleware, ensureFreelancer, serviceController.getRequestsForService);

router.post('/hire/:serviceId', authMiddleware, serviceController.hireService);

router.get('/:id', serviceController.getServiceById);

module.exports = router;
