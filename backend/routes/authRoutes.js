const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  sendMobileOtp,
  verifyMobileOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  sendLoginOtp,
  verifyLoginOtp,
  getMe,
  getAllUsers,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/send-otp', sendMobileOtp);
router.post('/verify-otp', verifyMobileOtp);

// Forgot Password Workflow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Email OTP Login Workflow
router.post('/send-login-otp', sendLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);

// Protected routes (Any authenticated user)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

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
