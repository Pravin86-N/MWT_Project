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

// Submit registration and fetch all registrations
router
  .route('/')
  .get(getRegistrations)
  .post(upload.any(), createRegistration);

// Dedicated register alias endpoint
router.post('/register', upload.any(), createRegistration);

// Specific registration by ID
router
  .route('/:id')
  .get(getRegistrationById)
  .delete(deleteRegistration);

// Customer Approval Workflow endpoints
router.put('/:id/approve', approveRegistration);
router.put('/:id/reject', rejectRegistration);

// Backward compatible PATCH status endpoint
router.patch('/:id/status', updateRegistrationStatus);

module.exports = router;
