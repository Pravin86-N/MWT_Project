const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicleById,
  updateVehicleLocation,
  updateVehicleStatus,
  getVehicleTracking,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// GET all vehicles (Staff & Drivers) & POST create vehicle (Depot Manager ONLY - Admin gets 403)
router
  .route('/')
  .get(protect, authorize(READ_STAFF, 'Driver'), getVehicles)
  .post(protect, authorize('Depot Manager'), createVehicle);

// UPDATE vehicle location (latitude, longitude, speed, fuelLevel) - Drivers & Depot Manager
router
  .route('/:id/location')
  .patch(protect, authorize('Driver', 'Depot Manager'), updateVehicleLocation)
  .put(protect, authorize('Driver', 'Depot Manager'), updateVehicleLocation);

// UPDATE vehicle status (Available, Assigned, In Transit, Delivered) - Depot Manager & Drivers
router
  .route('/:id/status')
  .patch(protect, authorize('Depot Manager', 'Driver'), updateVehicleStatus)
  .put(protect, authorize('Depot Manager', 'Driver'), updateVehicleStatus);

// Live vehicle tracking formatted for Google Maps (Authenticated)
router.get('/:id/tracking', protect, getVehicleTracking);

// GET vehicle by ID, PUT update (Depot Manager ONLY), DELETE (Admin ONLY)
router
  .route('/:id')
  .get(protect, authorize(READ_STAFF, 'Driver'), getVehicleById)
  .put(protect, authorize('Depot Manager'), updateVehicle)
  .delete(protect, authorize('Admin'), deleteVehicle);

module.exports = router;
