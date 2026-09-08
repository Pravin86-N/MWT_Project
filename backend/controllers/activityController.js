const ActivityLog = require('../models/ActivityLog');

// Internal helper function to log activity from any controller
const logActivity = async ({
  action,
  userId = null,
  userName = 'System',
  userRole = 'Admin',
  entityId = '',
  details = '',
  ipAddress = '',
  metadata = {},
}) => {
  try {
    return await ActivityLog.create({
      action,
      userId,
      userName,
      userRole,
      entityId,
      details,
      ipAddress,
      metadata,
    });
  } catch (error) {
    console.warn('[ActivityLog Warning] Failed to record activity log:', error.message);
    return null;
  }
};

// @desc    Get activity logs (with filters and pagination)
// @route   GET /api/activities
// @access  Protected (Admin, Depot Manager)
const getActivityLogs = async (req, res, next) => {
  try {
    const { action, userRole, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (userRole) {
      filter.userRole = userRole;
    }

    if (search) {
      filter.$or = [
        { userName: new RegExp(search, 'i') },
        { entityId: new RegExp(search, 'i') },
        { details: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logActivity,
  getActivityLogs,
};
