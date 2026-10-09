const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryById,
  updateInventory,
  getLowStockAlerts,
  requestRefill,
  getRefillHistory,
  checkStock,
} = require('../controllers/inventoryController');
const { protect, authorize, READ_STAFF } = require('../middleware/authMiddleware');

// 1. View Inventory (Staff)
router.get('/', protect, authorize(READ_STAFF), getInventory);
router.get('/tanks', protect, authorize(READ_STAFF), getInventory);

// 2. Low Stock Alert (Staff)
router.get('/alerts', protect, authorize(READ_STAFF), getLowStockAlerts);
router.get('/low-stock', protect, authorize(READ_STAFF), getLowStockAlerts);

// 3. Refill Request (Depot Manager ONLY - Admin gets 403)
router.post('/refill', protect, authorize('Depot Manager'), requestRefill);
router.post('/refill-request', protect, authorize('Depot Manager'), requestRefill);
router.get('/refills', protect, authorize(READ_STAFF), getRefillHistory);
router.get('/refill-history', protect, authorize(READ_STAFF), getRefillHistory);

// Stock availability check (Authenticated)
router.get('/check-stock', protect, checkStock);

// 4. Update Inventory (Depot Manager ONLY - Admin VIEW only) / Single Item View
router.get('/:id', protect, authorize(READ_STAFF), getInventoryById);
router.put('/:id', protect, authorize('Depot Manager'), updateInventory);
router.patch('/:id', protect, authorize('Depot Manager'), updateInventory);
router.put('/tanks/:id', protect, authorize('Depot Manager'), updateInventory);

module.exports = router;
