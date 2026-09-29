const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    driverName: {
      type: String,
      default: '',
      trim: true,
    },
    vehicleId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    speed: {
      type: Number,
      default: 0,
      min: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'DriverLocations', // Explicit collection name as per Requirement 4
  }
);

// Compound indexes for fast historical queries
driverLocationSchema.index({ vehicleId: 1, timestamp: -1 });
driverLocationSchema.index({ driverId: 1, timestamp: -1 });

module.exports = mongoose.model('DriverLocation', driverLocationSchema, 'DriverLocations');
