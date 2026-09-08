const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/activities - Retrieve audit trail and activity feed
router.get('/', protect, getActivityLogs);

module.exports = router;
