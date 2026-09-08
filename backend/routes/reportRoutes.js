const express = require('express');
const router = express.Router();
const {
  getReportsSummary,
  getDashboardReports,
  getReports,
} = require('../controllers/reportController');

// All reports summary and dashboard endpoints
router.get('/dashboard', getDashboardReports);
router.get('/summary', getReportsSummary);
router.get('/', getReports);

module.exports = router;
