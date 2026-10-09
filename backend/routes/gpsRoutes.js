const express = require('express');
const router = express.Router();
const {
  updateGpsLocation,
  getVehicleLocations,
  getVehicleHistory,
} = require('../controllers/gpsController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/gps/update - Send latitude, longitude, speed, heading, timestamp to backend (Driver / Telemetry)
router.post('/update', protect, updateGpsLocation);

// GET /api/gps/vehicles - Get all vehicles with live coordinates (Depot scoped)
router.get('/vehicles', protect, getVehicleLocations);

// GET /api/gps/history/:vehicleId - Get GPS history for vehicle
router.get('/history/:vehicleId', protect, getVehicleHistory);

module.exports = router;
