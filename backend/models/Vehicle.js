const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number/plate is required'],
      unique: true,
      trim: true,
    },
    // Alias for backward compatibility
    vehicle: {
      type: String,
      trim: true,
      default: function () {
        return this.vehicleNumber;
      },
    },
    driverName: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    // Alias for backward compatibility
    driver: {
      type: String,
      trim: true,
      default: function () {
        return this.driverName;
      },
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      default: 13.0827, // Chennai depot base
    },
    // Alias for backward compatibility
    lat: {
      type: Number,
      default: function () {
        return this.latitude;
      },
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      default: 80.2707, // Chennai depot base
    },
    // Alias for backward compatibility
    lng: {
      type: Number,
      default: function () {
        return this.longitude;
      },
    },
    speed: {
      type: Number,
      default: 0,
      min: [0, 'Speed cannot be negative'],
    },
    fuelLevel: {
      type: Number,
      default: 100,
      min: [0, 'Fuel level must be at least 0%'],
      max: [100, 'Fuel level cannot exceed 100%'],
    },
    status: {
      type: String,
      enum: {
        values: [
          'Available',
          'Assigned',
          'In Transit',
          'Delivered',
          'InTransit',
          'Idle',
          'Dispatched',
          'Delivering',
          'Maintenance',
        ],
        message: '{VALUE} is not a valid vehicle status',
      },
      default: 'Available',
    },
    // MongoDB 2dsphere GeoJSON Point for Google Maps & geospatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] in GeoJSON
        default: [80.2707, 13.0827],
      },
    },
    // Location history breadcrumbs for Google Maps route polylines
    locationHistory: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        speed: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    fuelCargo: {
      type: String,
      enum: ['DSL', 'PTL', 'LPG', 'KRS', 'None'],
      default: 'DSL',
    },
    cargoL: {
      type: Number,
      default: 0,
      min: 0,
    },
    tirePressure: {
      type: Number,
      default: 110,
    },
    engineTemp: {
      type: Number,
      default: 85,
    },
    dest: {
      type: String,
      default: 'Depot Base',
      trim: true,
    },
    eta: {
      type: String,
      default: 'Stationary',
    },
    x: {
      type: Number,
      default: 50,
    },
    y: {
      type: Number,
      default: 50,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for Google Maps integration: LatLng literal { lat, lng }
vehicleSchema.virtual('googleMapsLatLng').get(function () {
  return {
    lat: this.latitude,
    lng: this.longitude,
  };
});

// Virtual for Google Maps direct navigation URL
vehicleSchema.virtual('googleMapsUrl').get(function () {
  return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
});

// 2dsphere index for MongoDB geospatial queries
vehicleSchema.index({ location: '2dsphere' });

// Pre-validate hook to sync aliases and GeoJSON coordinates
vehicleSchema.pre('validate', function () {
  if (!this.vehicleNumber && this.vehicle) {
    this.vehicleNumber = this.vehicle;
  }
  if (!this.vehicle && this.vehicleNumber) {
    this.vehicle = this.vehicleNumber;
  }

  if (!this.driverName && this.driver) {
    this.driverName = this.driver;
  }
  if (!this.driver && this.driverName) {
    this.driver = this.driverName;
  }

  if (this.latitude == null && this.lat != null) {
    this.latitude = this.lat;
  }
  if (this.lat == null && this.latitude != null) {
    this.lat = this.latitude;
  }

  if (this.longitude == null && this.lng != null) {
    this.longitude = this.lng;
  }
  if (this.lng == null && this.longitude != null) {
    this.lng = this.longitude;
  }

  const lng = this.longitude != null ? this.longitude : 80.2707;
  const lat = this.latitude != null ? this.latitude : 13.0827;
  this.location = {
    type: 'Point',
    coordinates: [lng, lat],
  };
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
