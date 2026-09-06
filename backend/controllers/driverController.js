const Driver = require('../models/Driver');

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Public (or Protected)
const getDrivers = async (req, res, next) => {
  try {
    const { onDuty } = req.query;
    const filter = {};
    if (onDuty !== undefined) filter.onDuty = onDuty === 'true';

    const drivers = await Driver.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      count: drivers.length,
      data: drivers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single driver by ID
// @route   GET /api/drivers/:id
// @access  Public (or Protected)
const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new driver
// @route   POST /api/drivers
// @access  Private (Admin, Depot Manager)
const createDriver = async (req, res, next) => {
  try {
    const { name, phone, vehicle, onDuty, licenseNumber, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Driver name and phone number are required',
      });
    }

    const driver = await Driver.create({
      name,
      phone,
      vehicle: vehicle || '',
      onDuty: onDuty !== undefined ? onDuty : true,
      licenseNumber: licenseNumber || '',
      email: email || '',
    });

    res.status(201).json({
      success: true,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Private (Admin, Depot Manager)
const updateDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private (Admin, Depot Manager)
const deleteDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, message: 'Driver removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};
