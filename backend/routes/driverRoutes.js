const express = require('express');
const router = express.Router();
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  saveDriverLocation,
  getDriverLocationHistory,
} = require('../controllers/driverController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// GET all drivers (Staff & Drivers) & POST create driver (Depot Manager ONLY - Admin gets 403)
router.route('/')
  .get(protect, authorize(READ_STAFF, 'Driver'), getDrivers)
  .post(protect, authorize('Depot Manager'), createDriver);

// GPS Location Tracking endpoints (Driver & Depot Manager)
router.post('/location', protect, authorize('Driver', 'Depot Manager'), saveDriverLocation);
router.get('/location/history', protect, authorize(READ_STAFF, 'Driver'), getDriverLocationHistory);

// Single driver operations: GET (Staff), PUT (Depot Manager ONLY), DELETE (Admin ONLY)
router.route('/:id')
  .get(protect, authorize(READ_STAFF, 'Driver'), getDriverById)
  .put(protect, authorize('Depot Manager'), updateDriver)
  .delete(protect, authorize('Admin'), deleteDriver);

module.exports = router;
