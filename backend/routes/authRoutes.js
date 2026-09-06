const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  updateProfile,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (Any authenticated user: Admin, Depot Manager, Customer)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Role-based authorized routes
// Admin-only route
router.get('/admin', protect, authorize('Admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Admin resource',
    user: req.user,
  });
});

// Depot Manager and Admin route
router.get('/depot-manager', protect, authorize('Depot Manager', 'Admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Depot Manager resource',
    user: req.user,
  });
});

// Customer route
router.get('/customer', protect, authorize('Customer', 'Admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted: Customer resource',
    user: req.user,
  });
});

// Users management (Admin, Depot Manager)
router.get('/users', protect, authorize('Admin', 'Depot Manager'), getAllUsers);

module.exports = router;
