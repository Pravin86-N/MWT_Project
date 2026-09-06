const FuelPricing = require('../models/FuelPricing');

const DEFAULT_PRICES = [
  { code: 'DSL', name: 'Diesel', price: 92.4, color: '#f59e0b', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'PTL', name: 'Petrol', price: 104.8, color: '#3b82f6', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'LPG', name: 'LPG', price: 61.2, color: '#10b981', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'KRS', name: 'Kerosene', price: 74.6, color: '#6b7280', taxRate: 0.18, deliveryCharge: 250 },
];

const mongoose = require('mongoose');

// @desc    Get all fuel prices
// @route   GET /api/pricing
// @access  Public
const getFuelPrices = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        count: DEFAULT_PRICES.length,
        data: DEFAULT_PRICES,
        note: 'Default offline rates (MongoDB not connected)',
      });
    }

    let prices = await FuelPricing.find({});

    if (prices.length === 0) {
      // Return defaults if database is not seeded yet
      return res.json({
        success: true,
        count: DEFAULT_PRICES.length,
        data: DEFAULT_PRICES,
      });
    }

    res.json({
      success: true,
      count: prices.length,
      data: prices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update fuel price
// @route   PUT /api/pricing/:code
// @access  Private (Admin, Depot Manager)
const updateFuelPrice = async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const { price, name, color, taxRate, deliveryCharge } = req.body;

    let fuel = await FuelPricing.findOne({ code });

    if (!fuel) {
      const defaultItem = DEFAULT_PRICES.find((p) => p.code === code) || {
        code,
        name: code,
        price: Number(price),
        color: '#f59e0b',
      };
      fuel = new FuelPricing({ ...defaultItem, price: Number(price) });
    } else {
      if (price !== undefined) fuel.price = Number(price);
      if (name !== undefined) fuel.name = name;
      if (color !== undefined) fuel.color = color;
      if (taxRate !== undefined) fuel.taxRate = Number(taxRate);
      if (deliveryCharge !== undefined) fuel.deliveryCharge = Number(deliveryCharge);
    }

    await fuel.save();

    res.json({
      success: true,
      message: `Price for ${code} updated to ₹${fuel.price}/L`,
      data: fuel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate price quote for volume
// @route   POST /api/pricing/calculate
// @access  Public
const calculateQuote = async (req, res, next) => {
  try {
    const { fuelCode, qty } = req.body;

    if (!fuelCode || !qty) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fuelCode and qty',
      });
    }

    const code = fuelCode.toUpperCase();
    const quantity = Number(qty);

    let pricing = await FuelPricing.findOne({ code });
    if (!pricing) {
      pricing = DEFAULT_PRICES.find((p) => p.code === code) || DEFAULT_PRICES[0];
    }

    const unitPrice = pricing.price;
    const taxRate = pricing.taxRate !== undefined ? pricing.taxRate : 0.18;
    const deliveryCharge = pricing.deliveryCharge !== undefined ? pricing.deliveryCharge : 250;

    const subtotal = Math.round(unitPrice * quantity * 100) / 100;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax + deliveryCharge) * 100) / 100;

    res.json({
      success: true,
      fuelCode: code,
      fuelName: pricing.name,
      unitPrice,
      qty: quantity,
      subtotal,
      tax,
      taxRate,
      deliveryCharge,
      total,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFuelPrices,
  updateFuelPrice,
  calculateQuote,
};
