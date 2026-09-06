const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    vehicle: {
      type: String,
      default: '',
      trim: true,
    },
    onDuty: {
      type: Boolean,
      default: true,
    },
    deliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    licenseNumber: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Driver', driverSchema);
