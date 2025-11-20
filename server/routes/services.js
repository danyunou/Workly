//routes/services.js
const express = require('express');
const router = express.Router();

const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const ensureFreelancer = require('../middleware/ensureFreelancer');

const multer = require('multer');
const upload = multer(); // Middleware para archivos

// Obtener todos los servicios agrupados por categoría (público)
router.get('/', serviceController.getAllServices);

// Crear un nuevo servicio (solo freelancers autenticados)
router.post(
  '/',
  authMiddleware,
  ensureFreelancer,
  upload.fields([{ name: 'image' }]),
  serviceController.createService
);

// Obtener servicios por categoría (público)
router.get('/category/:category', serviceController.getServicesByCategory);

// Obtener servicios del freelancer autenticado
router.get(
  '/by-freelancer',
  authMiddleware,
  ensureFreelancer,
  serviceController.getServicesByFreelancer
);

// Marcar servicio como activo / inactivo 
router.patch(
  '/:id/active',
  authMiddleware,
  ensureFreelancer,
  serviceController.setServiceActiveState
);

// Eliminar un servicio
router.delete(
  '/:id',
  authMiddleware,
  ensureFreelancer,
  serviceController.deleteService
);

// Actualizar un servicio completo (editar)
router.put(
  '/:id',
  authMiddleware,
  ensureFreelancer,
  upload.fields([{ name: 'image' }]),
  serviceController.updateService
);

// Obtener solicitudes de un servicio (solo freelancer dueño del servicio)
router.get(
  '/:id/requests',
  authMiddleware,
  ensureFreelancer,
  serviceController.getRequestsForService
);

// Aceptar una solicitud de servicio concreta (crea proyecto)
router.post(
  '/requests/:requestId/accept',
  authMiddleware,
  ensureFreelancer,
  serviceController.acceptServiceRequest
);

// Cliente envía una solicitud para contratar un servicio
router.post(
  '/hire/:serviceId',
  authMiddleware,
  serviceController.hireService
);

// Obtener un servicio por ID (público)
router.get('/:id', serviceController.getServiceById);

// Crear reseña de un servicio (cliente autenticado)
router.post('/:id/reviews', authMiddleware, serviceController.createServiceReview);

// Obtener reseñas de un servicio (público)
router.get('/:id/reviews', serviceController.getServiceReviews);

module.exports = router;
