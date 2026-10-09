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
const { protect, authorize, READ_STAFF, ADMIN_ONLY } = require('../middleware/authMiddleware');

// @route   GET /api/customers & POST /api/customers
router
  .route('/')
  .get(protect, authorize(READ_STAFF), getCustomers)
  .post(upload.any(), createCustomer);

// Dedicated register alias (Public)
router.post('/register', upload.any(), createCustomer);

// @route   GET /api/customers/:id & DELETE /api/customers/:id
router
  .route('/:id')
  .get(protect, authorize(READ_STAFF), getCustomerById)
  .delete(protect, authorize(ADMIN_ONLY), deleteCustomer);

// @route   PATCH /api/customers/:id/status (Admin ONLY - Depot Manager gets 403)
router.patch('/:id/status', protect, authorize(ADMIN_ONLY), updateCustomerStatus);

module.exports = router;
