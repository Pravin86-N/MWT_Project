const Driver = require('../models/Driver');
const DriverLocation = require('../models/DriverLocation');
const Vehicle = require('../models/Vehicle');
const { getIO } = require('../config/socket');

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

// @desc    Save live GPS location from driver mobile phone
// @route   POST /api/drivers/location
// @access  Public / Protected
const saveDriverLocation = async (req, res, next) => {
  try {
    const { driverId, vehicleId, latitude, longitude, timestamp, speed, heading, accuracy } = req.body;

    if (latitude == null || longitude == null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({
        success: false,
        message: 'Valid numerical latitude and longitude are required',
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90, and longitude between -180 and 180',
      });
    }

    // Resolve driver name if possible
    let resolvedDriverName = '';
    if (driverId) {
      try {
        const d = await Driver.findById(driverId);
        if (d) resolvedDriverName = d.name;
      } catch (err) {
        // Driver ID might be user ID or string
      }
    }

    const locationRecord = await DriverLocation.create({
      driverId: driverId || null,
      driverName: resolvedDriverName || req.body.driverName || '',
      vehicleId: vehicleId || '',
      latitude: lat,
      longitude: lng,
      speed: Number(speed) || 0,
      heading: Number(heading) || 0,
      accuracy: Number(accuracy) || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Update vehicle coordinates, locationHistory (capped at 1000)
    let updatedVehicle = null;
    if (vehicleId) {
      let vehicleDoc = null;
      if (typeof vehicleId === 'string' && vehicleId.match(/^[0-9a-fA-F]{24}$/)) {
        vehicleDoc = await Vehicle.findById(vehicleId);
      } else {
        vehicleDoc = await Vehicle.findOne({
          $or: [{ vehicleNumber: vehicleId }, { vehicle: vehicleId }],
        });
      }

      if (vehicleDoc) {
        vehicleDoc.latitude = lat;
        vehicleDoc.lat = lat;
        vehicleDoc.longitude = lng;
        vehicleDoc.lng = lng;
        vehicleDoc.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
        if (speed != null && !isNaN(Number(speed))) {
          vehicleDoc.speed = Number(speed);
        }

        vehicleDoc.locationHistory.push({
          latitude: lat,
          longitude: lng,
          speed: Number(speed) || 0,
          timestamp: locationRecord.timestamp,
        });

        if (vehicleDoc.locationHistory.length > 1000) {
          vehicleDoc.locationHistory = vehicleDoc.locationHistory.slice(-1000);
        }

        await vehicleDoc.save();
        updatedVehicle = vehicleDoc;
      }
    }

    // Broadcast live location update via Socket.IO
    const io = getIO();
    if (io) {
      const socketPayload = {
        driverId: locationRecord.driverId,
        driverName: locationRecord.driverName,
        vehicleId: locationRecord.vehicleId,
        latitude: locationRecord.latitude,
        longitude: locationRecord.longitude,
        speed: locationRecord.speed,
        heading: locationRecord.heading,
        accuracy: locationRecord.accuracy,
        timestamp: locationRecord.timestamp,
      };
      io.emit('location_update', socketPayload);
      if (vehicleId) {
        io.to(`vehicle:${vehicleId}`).emit('location_update', socketPayload);
      }
      if (driverId) {
        io.to(`driver:${driverId}`).emit('location_update', socketPayload);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Driver location recorded and broadcasted successfully',
      data: locationRecord,
      vehicle: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get location history for route polyline
// @route   GET /api/drivers/location/history
// @access  Public / Protected
const getDriverLocationHistory = async (req, res, next) => {
  try {
    const { vehicleId, driverId, limit = 1000 } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;

    const maxLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 1000));

    const records = await DriverLocation.find(filter)
      .sort({ timestamp: -1 })
      .limit(maxLimit)
      .lean();

    // Reverse so coordinates are chronological for polyline rendering
    const history = records.reverse();

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
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
  saveDriverLocation,
  getDriverLocationHistory,
};
