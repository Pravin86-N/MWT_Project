const mongoose = require('mongoose');

const fuelPricingSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      enum: ['DSL', 'PTL', 'LPG', 'KRS'],
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    color: {
      type: String,
      default: '#f59e0b',
    },
    taxRate: {
      type: Number,
      default: 0.18,
    },
    deliveryCharge: {
      type: Number,
      default: 250,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FuelPricing', fuelPricingSchema);
