const express = require('express');
const router = express.Router();
const {
  getFuelPrices,
  updateFuelPrice,
  calculateQuote,
} = require('../controllers/pricingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getFuelPrices);
router.put('/:code', protect, authorize('Admin'), updateFuelPrice);
router.post('/calculate', calculateQuote);

module.exports = router;

