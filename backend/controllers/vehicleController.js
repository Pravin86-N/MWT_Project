const Vehicle = require('../models/Vehicle');

// @desc    Get all vehicles (with live location, speed, fuelLevel, status)
// @route   GET /api/vehicles (or GET /api/fleet)
// @access  Public / Protected
const getVehicles = async (req, res, next) => {
  try {
    const { status, driverName, search } = req.query;
    const filter = {};

    if (status) {
      if (status === 'In Transit' || status === 'InTransit') {
        filter.status = { $in: ['In Transit', 'InTransit'] };
      } else {
        filter.status = status;
      }
    }

    if (driverName) {
      filter.$or = [
        { driverName: new RegExp(driverName, 'i') },
        { driver: new RegExp(driverName, 'i') },
      ];
    }

    if (search) {
      filter.$or = [
        { vehicleNumber: new RegExp(search, 'i') },
        { vehicle: new RegExp(search, 'i') },
        { driverName: new RegExp(search, 'i') },
        { driver: new RegExp(search, 'i') },
        { dest: new RegExp(search, 'i') },
      ];
    }

    const vehicles = await Vehicle.find(filter).sort({ vehicleNumber: 1, vehicle: 1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle by ID or plate number
// @route   GET /api/vehicles/:id
// @access  Public / Protected
const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vehicle;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findById(id);
    } else {
      vehicle = await Vehicle.findOne({
        $or: [{ vehicleNumber: id }, { vehicle: id }],
      });
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    UPDATE vehicle location (latitude, longitude, speed, fuelLevel)
// @route   PATCH /api/vehicles/:id/location (or PUT /api/vehicles/:id/location)
// @access  Protected (Driver, Telemetry GPS Device, Admin, Depot Manager)
const updateVehicleLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, lat, lng, speed, fuelLevel } = req.body;

    const newLat = latitude != null ? Number(latitude) : (lat != null ? Number(lat) : null);
    const newLng = longitude != null ? Number(longitude) : (lng != null ? Number(lng) : null);

    if (newLat == null || newLng == null || isNaN(newLat) || isNaN(newLng)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid numerical coordinates: latitude and longitude',
      });
    }

    if (newLat < -90 || newLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90 degrees',
      });
    }

    if (newLng < -180 || newLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180 degrees',
      });
    }

    let vehicle;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findById(id);
    } else {
      vehicle = await Vehicle.findOne({
        $or: [{ vehicleNumber: id }, { vehicle: id }],
      });
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // Update coordinates and aliases
    vehicle.latitude = newLat;
    vehicle.lat = newLat;
    vehicle.longitude = newLng;
    vehicle.lng = newLng;

    // Update MongoDB 2dsphere GeoJSON location
    vehicle.location = {
      type: 'Point',
      coordinates: [newLng, newLat],
    };

    if (speed != null && !isNaN(Number(speed))) {
      vehicle.speed = Math.max(0, Number(speed));
    }

    if (fuelLevel != null && !isNaN(Number(fuelLevel))) {
      vehicle.fuelLevel = Math.min(100, Math.max(0, Number(fuelLevel)));
    }

    // Record breadcrumb trail for Google Maps route polylines
    vehicle.locationHistory.push({
      latitude: newLat,
      longitude: newLng,
      speed: vehicle.speed,
      timestamp: new Date(),
    });

    // Keep history capped to last 1000 points as per requirement
    if (vehicle.locationHistory.length > 1000) {
      vehicle.locationHistory = vehicle.locationHistory.slice(-1000);
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle location updated successfully',
      data: vehicle,
      googleMaps: {
        center: { lat: vehicle.latitude, lng: vehicle.longitude },
        mapUrl: `https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    UPDATE vehicle status (Available, Assigned, In Transit, Delivered)
// @route   PATCH /api/vehicles/:id/status (or PUT /api/vehicles/:id/status)
// @access  Protected (Admin, Depot Manager, Driver)
const updateVehicleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'Available',
      'Assigned',
      'In Transit',
      'Delivered',
      'InTransit',
      'Idle',
      'Dispatched',
      'Delivering',
      'Maintenance',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Allowed statuses: Available, Assigned, In Transit, Delivered`,
      });
    }

    let vehicle;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findById(id);
    } else {
      vehicle = await Vehicle.findOne({
        $or: [{ vehicleNumber: id }, { vehicle: id }],
      });
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    vehicle.status = status;

    // Reset speed if Delivered or Available at depot
    if (status === 'Delivered' || status === 'Available' || status === 'Idle') {
      vehicle.speed = 0;
      vehicle.eta = 'Stationary';
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `Vehicle status updated to '${status}'`,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle live tracking data formatted for Google Maps
// @route   GET /api/vehicles/:id/tracking
// @access  Public / Protected
const getVehicleTracking = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vehicle;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findById(id);
    } else {
      vehicle = await Vehicle.findOne({
        $or: [{ vehicleNumber: id }, { vehicle: id }],
      });
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        vehicleNumber: vehicle.vehicleNumber || vehicle.vehicle,
        driverName: vehicle.driverName || vehicle.driver,
        status: vehicle.status,
        speed: vehicle.speed,
        fuelLevel: vehicle.fuelLevel,
        currentLocation: {
          lat: vehicle.latitude,
          lng: vehicle.longitude,
        },
        googleMaps: {
          center: { lat: vehicle.latitude, lng: vehicle.longitude },
          zoom: 14,
          mapUrl: `https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}`,
          polylinePath: vehicle.locationHistory.map((pt) => ({
            lat: pt.latitude,
            lng: pt.longitude,
          })),
        },
        lastUpdated: vehicle.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new vehicle to fleet
// @route   POST /api/vehicles
// @access  Private (Admin, Depot Manager)
const createVehicle = async (req, res, next) => {
  try {
    const {
      vehicleNumber,
      vehicle,
      driverName,
      driver,
      latitude,
      lat,
      longitude,
      lng,
      speed,
      fuelLevel,
      status,
    } = req.body;

    const plate = vehicleNumber || vehicle;
    if (!plate) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number/plate is required',
      });
    }

    const exists = await Vehicle.findOne({
      $or: [{ vehicleNumber: plate.trim() }, { vehicle: plate.trim() }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Vehicle '${plate}' already exists in fleet`,
      });
    }

    const newLat = latitude != null ? Number(latitude) : (lat != null ? Number(lat) : 13.0827);
    const newLng = longitude != null ? Number(longitude) : (lng != null ? Number(lng) : 80.2707);

    const newVehicle = await Vehicle.create({
      vehicleNumber: plate.trim(),
      vehicle: plate.trim(),
      driverName: driverName || driver || 'Unassigned',
      driver: driverName || driver || 'Unassigned',
      latitude: newLat,
      lat: newLat,
      longitude: newLng,
      lng: newLng,
      speed: speed ? Number(speed) : 0,
      fuelLevel: fuelLevel != null ? Number(fuelLevel) : 100,
      status: status || 'Available',
      location: {
        type: 'Point',
        coordinates: [newLng, newLat],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: newVehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vehicle details
// @route   PUT /api/vehicles/:id
// @access  Private
const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vehicle;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
    } else {
      vehicle = await Vehicle.findOneAndUpdate(
        { $or: [{ vehicleNumber: id }, { vehicle: id }] },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin)
const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vehicle;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      vehicle = await Vehicle.findByIdAndDelete(id);
    } else {
      vehicle = await Vehicle.findOneAndDelete({
        $or: [{ vehicleNumber: id }, { vehicle: id }],
      });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.status(200).json({ success: true, message: 'Vehicle removed from fleet' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  updateVehicleLocation,
  updateVehicleStatus,
  getVehicleTracking,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
