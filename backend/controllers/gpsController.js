const VehicleLocation = require('../models/VehicleLocation');
const Vehicle = require('../models/Vehicle');
const { getIO } = require('../config/socket');

// @desc    Update vehicle GPS location
// @route   POST /api/gps/update
// @access  Public / Protected (Driver, Telemetry Device)
const updateGpsLocation = async (req, res, next) => {
  try {
    const { vehicleId, latitude, longitude, speed, heading, timestamp } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

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

    const spd = Number(speed) || 0;
    const hdg = Number(heading) || 0;
    const time = timestamp ? new Date(timestamp) : new Date();

    // 1. Save location in MongoDB VehicleLocation collection (as required)
    const locationRecord = await VehicleLocation.create({
      vehicleId,
      latitude: lat,
      longitude: lng,
      speed: spd,
      heading: hdg,
      timestamp: time,
    });

    // 2. Update Vehicle document if present in fleet
    let updatedVehicle = null;
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
      vehicleDoc.speed = spd;
      vehicleDoc.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      if (!vehicleDoc.locationHistory) {
        vehicleDoc.locationHistory = [];
      }
      vehicleDoc.locationHistory.push({
        latitude: lat,
        longitude: lng,
        speed: spd,
        timestamp: time,
      });

      if (vehicleDoc.locationHistory.length > 1000) {
        vehicleDoc.locationHistory = vehicleDoc.locationHistory.slice(-1000);
      }

      await vehicleDoc.save();
      updatedVehicle = vehicleDoc;
    }

    // 3. Broadcast real-time location update to Socket.IO clients
    const io = getIO();
    const socketPayload = {
      vehicleId,
      latitude: lat,
      longitude: lng,
      speed: spd,
      heading: hdg,
      timestamp: time.toISOString(),
    };

    if (io) {
      // Primary event required by spec:
      io.emit('vehicle-location-update', socketPayload);
      // Legacy event for other listeners:
      io.emit('location_update', socketPayload);
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle location updated and broadcasted successfully',
      data: locationRecord,
      vehicle: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vehicles with latest live locations
// @route   GET /api/gps/vehicles
// @access  Public / Protected
const getVehicleLocations = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find().select('vehicleNumber vehicle driverName driver latitude longitude lat lng speed status fuelLevel location locationHistory');
    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get GPS history for a vehicle
// @route   GET /api/gps/history/:vehicleId
// @access  Public / Protected
const getVehicleHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 500));

    const records = await VehicleLocation.find({ vehicleId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: records.length,
      data: records.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateGpsLocation,
  getVehicleLocations,
  getVehicleHistory,
};
