const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const driverRoutes = require('./routes/driverRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const activityRoutes = require('./routes/activityRoutes');
const customerRoutes = require('./routes/customerRoutes');
const gpsRoutes = require('./routes/gpsRoutes');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      // Allow any localhost or 127.0.0.1 port
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Master API Router for top-level public path prefix routing (/api)
const apiRouter = express.Router();

// Auto-reconnect DB middleware for serverless / cold-start resilience
apiRouter.use(async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState < 1) {
      await connectDB();
    }
  } catch (err) {
    console.warn('[DB Middleware] Auto-reconnect warning:', err.message);
  }
  next();
});

// Health check endpoint (accessible via /api/health and /health)
const handleHealthCheck = (req, res) => {
  res.json({
    status: 'OK',
    service: 'Fuel Delivery Management System (FDMS) API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

apiRouter.get('/health', handleHealthCheck);
app.get('/health', handleHealthCheck);

// API Documentation and status endpoint (accessible via /api and /)
const handleApiRoot = (req, res) => {
  res.json({
    message: 'Welcome to Fuel Delivery Management System (FDMS) Backend API',
    version: '1.0.0',
    documentation: {
      health: '/api/health',
      auth: '/api/auth',
      orders: '/api/orders',
      inventory: '/api/inventory',
      drivers: '/api/drivers',
      fleet: '/api/fleet',
      vehicles: '/api/vehicles',
      registrations: '/api/registrations',
      customers: '/api/customers',
      pricing: '/api/pricing',
      notifications: '/api/notifications',
      reports: '/api/reports',
      activities: '/api/activities',
      gps: '/api/gps',
    },
  });
};

apiRouter.get('/', handleApiRoot);
app.get('/', handleApiRoot);

// Mount all domain routers on apiRouter
apiRouter.use('/auth', authRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/fleet', fleetRoutes);
apiRouter.use('/vehicles', fleetRoutes);
apiRouter.use('/registrations', registrationRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/pricing', pricingRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/activities', activityRoutes);
apiRouter.use('/gps', gpsRoutes);
apiRouter.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test insert route
apiRouter.get('/test-insert', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Test = mongoose.models.Test || mongoose.model(
      'Test',
      new mongoose.Schema({
        name: String,
      })
    );
    const data = await Test.create({
      name: 'Pravin',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount apiRouter at top-level public path prefix (/api)
app.use('/api', apiRouter);

// Also mount apiRouter at root (/) for seamless direct service invocation
app.use('/', apiRouter);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
initSocket(httpServer);

// Connect database before listening
const startServer = async () => {
  try {
    await connectDB();
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FDMS Backend] Port ${PORT} is already in use.`);
      } else {
        console.error(`[FDMS Backend] Server error: ${err.message}`);
      }
      process.exit(1);
    });
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[FDMS Backend] Server running with Socket.IO in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (0.0.0.0)`);
    });
    return server;
  } catch (error) {
    console.error(`[FDMS Backend] Failed to start server: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[FDMS Backend] Unhandled Rejection: ${err.message}`);
});

module.exports = app;
