const express = require('express');
const router = express.Router();
const {
  getReportsSummary,
  getDashboardReports,
  getReports,
} = require('../controllers/reportController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// All reports summary and dashboard endpoints (Staff ONLY)
router.get('/dashboard', protect, authorize(READ_STAFF), getDashboardReports);
router.get('/summary', protect, authorize(READ_STAFF), getReportsSummary);
router.get('/', protect, authorize(READ_STAFF), getReports);

module.exports = router;

