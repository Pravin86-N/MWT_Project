const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getPendingOrders,
  getDeliveryQueue,
  getOrderById,
  getOrderInvoice,
  approveOrder,
  rejectOrder,
  assignOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getSmartDispatchSuggestion,
} = require('../controllers/orderController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// Main orders collection: List orders (Authenticated) or Customer creates order
router
  .route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

// Smart Fuel Dispatch suggestion route (Admin & Depot Manager)
router.get('/:id/smart-dispatch', protect, authorize('Admin', 'Depot Manager'), getSmartDispatchSuggestion);
router.get('/smart-dispatch/suggest', protect, authorize('Admin', 'Depot Manager'), getSmartDispatchSuggestion);

// Pending orders awaiting approval (Staff)
router.get('/pending', protect, authorize(READ_STAFF), getPendingOrders);

// Delivery Queue: Approved orders ready for delivery & dispatch
router.get('/delivery-queue', protect, authorize('Admin', 'Depot Manager', 'Support Executive', 'Auditor', 'Driver'), getDeliveryQueue);
router.get('/queue', protect, authorize('Admin', 'Depot Manager', 'Support Executive', 'Auditor', 'Driver'), getDeliveryQueue);

// Order approval workflow (Admin override & Depot Manager)
router.patch('/:id/approve', protect, authorize('Admin', 'Depot Manager'), approveOrder);
router.patch('/:id/reject', protect, authorize('Admin', 'Depot Manager'), rejectOrder);

// Driver & Vehicle assignment (Depot Manager ONLY - Admin gets 403)
router.patch('/:id/assign', protect, authorize('Depot Manager'), assignOrder);
router.put('/:id/assign', protect, authorize('Depot Manager'), assignOrder);

// Order status updates (Admin, Depot Manager, Driver for deliveries, Customer for cancel)
router.patch('/:id/status', protect, authorize('Admin', 'Depot Manager', 'Driver', 'Customer'), updateOrderStatus);

// Single order operations & invoices
router.get('/:id/invoice', protect, getOrderInvoice);
router
  .route('/:id')
  .get(protect, getOrderById)
  .put(protect, authorize('Admin', 'Depot Manager'), updateOrder)
  .delete(protect, authorize('Admin'), deleteOrder);

module.exports = router;
