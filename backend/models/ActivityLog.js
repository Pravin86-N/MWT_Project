const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'Login',
        'Order Created',
        'Order Approved',
        'Order Rejected',
        'Driver Assigned',
        'Vehicle Assigned',
        'Delivery Started',
        'Delivery Completed',
        'Refill Requested',
        'Registration Submitted',
        'Registration Approved',
        'Registration Rejected',
        'Profile Updated',
        'Vehicle Added',
        'Driver Added',
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'System',
      trim: true,
    },
    userRole: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    entityId: {
      type: String,
      default: '',
      trim: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
