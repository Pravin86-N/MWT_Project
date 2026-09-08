const Notification = require('../models/Notification');

// @desc    Get notifications with optional filtering
// @route   GET /api/notifications
// @access  Public / Protected
const getNotifications = async (req, res, next) => {
  try {
    const { role, unreadOnly, limit = 50 } = req.query;
    const filter = {};

    if (role && role !== 'All') {
      filter.$or = [{ role: 'All' }, { role: role }];
    }

    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Public / Protected
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Public / Protected
const markAllAsRead = async (req, res, next) => {
  try {
    const { role } = req.body;
    const filter = { read: false };
    if (role && role !== 'All') {
      filter.$or = [{ role: 'All' }, { role: role }];
    }

    await Notification.updateMany(filter, {
      read: true,
      readAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new notification
// @route   POST /api/notifications
// @access  Public / Protected
const createNotification = async (req, res, next) => {
  try {
    const { title, message, category, role, type, orderId } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    const notification = await Notification.create({
      title,
      message,
      category: category || 'general',
      role: role || 'All',
      type: type || 'info',
      orderId: orderId || '',
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};
