const express = require('express');
const router = express.Router();
const {
  getFuelPrices,
  updateFuelPrice,
  calculateQuote,
} = require('../controllers/pricingController');

router.get('/', getFuelPrices);
router.put('/:code', updateFuelPrice);
router.post('/calculate', calculateQuote);

module.exports = router;
