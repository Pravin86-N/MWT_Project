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

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
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
app.use('/api/customers', registrationRoutes);
app.use('/api/pricing', pricingRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect database before app.listen()
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[FDMS Backend] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
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
