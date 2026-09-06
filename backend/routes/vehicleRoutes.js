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

// GET all vehicles & POST create vehicle
router
  .route('/')
  .get(getVehicles)
  .post(createVehicle);

// UPDATE vehicle location (latitude, longitude, speed, fuelLevel)
router
  .route('/:id/location')
  .patch(updateVehicleLocation)
  .put(updateVehicleLocation);

// UPDATE vehicle status (Available, Assigned, In Transit, Delivered)
router
  .route('/:id/status')
  .patch(updateVehicleStatus)
  .put(updateVehicleStatus);

// Live vehicle tracking formatted for Google Maps
router.get('/:id/tracking', getVehicleTracking);

// GET vehicle by ID, PUT update, DELETE
router
  .route('/:id')
  .get(getVehicleById)
  .put(updateVehicle)
  .delete(deleteVehicle);

module.exports = router;
