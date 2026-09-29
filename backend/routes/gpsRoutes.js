const express = require('express');
const router = express.Router();
const {
  updateGpsLocation,
  getVehicleLocations,
  getVehicleHistory,
} = require('../controllers/gpsController');

// POST /api/gps/update - Send latitude, longitude, speed, heading, timestamp to backend
router.post('/update', updateGpsLocation);

// GET /api/gps/vehicles - Get all vehicles with live coordinates
router.get('/vehicles', getVehicleLocations);

// GET /api/gps/history/:vehicleId - Get GPS history for vehicle
router.get('/history/:vehicleId', getVehicleHistory);

module.exports = router;
