const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
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
