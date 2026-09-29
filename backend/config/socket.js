const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join role-based and user-specific rooms
    socket.on('join_room', (data) => {
      if (!data) return;
      const { role, userId } = data;
      if (role) {
        socket.join(`role:${role}`);
        // Normalize Manager / Depot Manager
        if (role === 'Depot Manager' || role === 'Manager') {
          socket.join('role:Manager');
          socket.join('role:Depot Manager');
        }
        console.log(`[Socket.IO] ${socket.id} joined room: role:${role}`);
      }
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket.IO] ${socket.id} joined room: user:${userId}`);
      }
    });

    // Join vehicle tracking room
    socket.on('join_vehicle', (vehicleId) => {
      if (vehicleId) {
        socket.join(`vehicle:${vehicleId}`);
        console.log(`[Socket.IO] ${socket.id} joined room: vehicle:${vehicleId}`);
      }
    });

    // Allow client to emit location update over socket directly as well
    socket.on('update_location', (data) => {
      if (!data) return;
      const payload = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      io.emit('location_update', payload);
      io.emit('vehicle-location-update', payload);
      if (data.vehicleId) {
        io.to(`vehicle:${data.vehicleId}`).emit('location_update', payload);
        io.to(`vehicle:${data.vehicleId}`).emit('vehicle-location-update', payload);
      }
      if (data.driverId) {
        io.to(`driver:${data.driverId}`).emit('location_update', payload);
      }
    });

    // Real-time GPS Tracking specification event: vehicle-location-update
    socket.on('vehicle-location-update', async (data) => {
      if (!data) return;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      const vehicleId = data.vehicleId;
      if (!vehicleId || isNaN(lat) || isNaN(lng)) return;

      const payload = {
        vehicleId,
        latitude: lat,
        longitude: lng,
        speed: Number(data.speed) || 0,
        heading: Number(data.heading) || 0,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      // Broadcast immediately to all connected clients (Admin, Manager, Customer)
      io.emit('vehicle-location-update', payload);
      io.emit('location_update', payload);

      // Persist to MongoDB VehicleLocation collection
      try {
        const VehicleLocation = require('../models/VehicleLocation');
        await VehicleLocation.create({
          vehicleId,
          latitude: lat,
          longitude: lng,
          speed: payload.speed,
          heading: payload.heading,
          timestamp: new Date(payload.timestamp),
        });

        // Update Vehicle doc if found
        const Vehicle = require('../models/Vehicle');
        const vDoc = await Vehicle.findOne({
          $or: [{ vehicleNumber: vehicleId }, { vehicle: vehicleId }],
        });
        if (vDoc) {
          vDoc.latitude = lat;
          vDoc.lat = lat;
          vDoc.longitude = lng;
          vDoc.lng = lng;
          vDoc.speed = payload.speed;
          vDoc.location = { type: 'Point', coordinates: [lng, lat] };
          if (!vDoc.locationHistory) vDoc.locationHistory = [];
          vDoc.locationHistory.push({
            latitude: lat,
            longitude: lng,
            speed: payload.speed,
            timestamp: new Date(payload.timestamp),
          });
          if (vDoc.locationHistory.length > 1000) {
            vDoc.locationHistory = vDoc.locationHistory.slice(-1000);
          }
          await vDoc.save();
        }
      } catch (err) {
        console.warn('[Socket.IO vehicle-location-update] MongoDB save error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

/**
 * Broadcast real-time notification to targeted role or user
 * @param {Object} options
 * @param {string} options.role - Target role: 'Customer', 'Driver', 'Depot Manager', 'Manager', 'Admin', or 'All'
 * @param {string} [options.userId] - Specific user ID target
 * @param {string} [options.event] - Event name, e.g. 'order_submitted', 'order_approved'
 * @param {Object} options.notification - Notification payload
 */
const emitNotification = ({ role = 'All', userId = null, event = 'notification', notification }) => {
  if (!io) {
    console.warn('[Socket.IO Warning] Socket.IO is not initialized yet');
    return;
  }

  try {
    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    if (userId) {
      io.to(`user:${userId}`).emit(event, payload);
      io.to(`user:${userId}`).emit('notification', payload);
    } else if (role === 'All' || !role) {
      io.emit(event, payload);
      io.emit('notification', payload);
    } else {
      io.to(`role:${role}`).emit(event, payload);
      io.to(`role:${role}`).emit('notification', payload);
      if (role === 'Depot Manager' || role === 'Manager') {
        io.to('role:Manager').emit(event, payload);
        io.to('role:Manager').emit('notification', payload);
        io.to('role:Depot Manager').emit(event, payload);
        io.to('role:Depot Manager').emit('notification', payload);
      }
    }
  } catch (error) {
    console.error('[Socket.IO Emit Error]:', error.message);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitNotification,
};
