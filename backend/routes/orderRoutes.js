const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getPendingOrders,
  getDeliveryQueue,
  getOrderById,
  approveOrder,
  rejectOrder,
  assignOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');

// Main orders collection: List orders or Customer creates order
router
  .route('/')
  .get(getOrders)
  .post(createOrder);

// Depot Manager dashboard: Pending orders awaiting approval
router.get('/pending', getPendingOrders);

// Delivery Queue: Approved orders ready for delivery & dispatch
router.get('/delivery-queue', getDeliveryQueue);
router.get('/queue', getDeliveryQueue);

// Depot Manager workflow actions
router.patch('/:id/approve', approveOrder);
router.patch('/:id/reject', rejectOrder);
router.patch('/:id/assign', assignOrder);
router.patch('/:id/status', updateOrderStatus);

// Single order operations
router
  .route('/:id')
  .get(getOrderById)
  .put(updateOrder)
  .delete(deleteOrder);

module.exports = router;
