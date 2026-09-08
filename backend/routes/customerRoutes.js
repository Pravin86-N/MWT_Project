const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomerStatus,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/customers & POST /api/customers
router
  .route('/')
  .get(getCustomers)
  .post(upload.any(), createCustomer);

// Dedicated register alias
router.post('/register', upload.any(), createCustomer);

// @route   GET /api/customers/:id & DELETE /api/customers/:id
router
  .route('/:id')
  .get(getCustomerById)
  .delete(protect, authorize('Admin', 'Depot Manager'), deleteCustomer);

// @route   PATCH /api/customers/:id/status
router.patch('/:id/status', protect, authorize('Admin', 'Depot Manager'), updateCustomerStatus);

module.exports = router;
