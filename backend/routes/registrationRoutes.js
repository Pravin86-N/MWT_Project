const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  getRegistrations,
  getRegistrationById,
  createRegistration,
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

// Status review (Approval / Rejection)
router.patch('/:id/status', updateRegistrationStatus);

module.exports = router;
