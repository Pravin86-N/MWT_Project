const express = require('express');
const router = express.Router();
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driverController');

router.route('/')
  .get(getDrivers)
  .post(createDriver);

router.route('/:id')
  .get(getDriverById)
  .put(updateDriver)
  .delete(deleteDriver);

module.exports = router;
