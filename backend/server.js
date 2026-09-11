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

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Fuel Delivery Management System (FDMS) API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
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
      registrations: '/api/registrations',
      customers: '/api/customers',
      pricing: '/api/pricing',
    },
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/vehicles', fleetRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activities', activityRoutes);

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
    const server = httpServer.listen(PORT, () => {
      console.log(`[FDMS Backend] Server running with Socket.IO in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
    return server;
  } catch (error) {
    console.error(`[FDMS Backend] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[FDMS Backend] Unhandled Rejection: ${err.message}`);
});
app.get("/api/test-insert", async (req, res) => {
  const mongoose = require("mongoose");

  const Test = mongoose.model(
    "Test",
    new mongoose.Schema({
      name: String,
    })
  );

  const data = await Test.create({
    name: "Pravin",
  });

  res.json(data);
});

module.exports = app;
