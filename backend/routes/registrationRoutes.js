const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  approveRegistration,
  rejectRegistration,
  updateRegistrationStatus,
  deleteRegistration,
} = require('../controllers/registrationController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// Submit registration (Public) and fetch all registrations (Staff only)
router
  .route('/')
  .get(protect, authorize(READ_STAFF), getRegistrations)
  .post(upload.any(), createRegistration);

// Dedicated register alias endpoint
router.post('/register', upload.any(), createRegistration);

// Specific registration by ID
router
  .route('/:id')
  .get(protect, authorize(READ_STAFF), getRegistrationById)
  .delete(protect, authorize('Admin'), deleteRegistration);

// Customer Approval Workflow endpoints (Admin ONLY - Depot Manager gets 403)
router.put('/:id/approve', protect, authorize('Admin'), approveRegistration);
router.put('/:id/reject', protect, authorize('Admin'), rejectRegistration);

// Backward compatible PATCH status endpoint (Admin ONLY)
router.patch('/:id/status', protect, authorize('Admin'), updateRegistrationStatus);

module.exports = router;
