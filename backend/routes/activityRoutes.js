const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/activities - Retrieve audit trail and activity feed (Admin & Auditor ONLY)
router.get('/', protect, authorize('Admin', 'Auditor'), getActivityLogs);

module.exports = router;
