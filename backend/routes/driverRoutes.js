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

router.route('/')
  .get(getDrivers)
  .post(createDriver);

// GPS Location Tracking endpoints (must come before /:id)
router.post('/location', saveDriverLocation);
router.get('/location/history', getDriverLocationHistory);

router.route('/:id')
  .get(getDriverById)
  .put(updateDriver)
  .delete(deleteDriver);

module.exports = router;
