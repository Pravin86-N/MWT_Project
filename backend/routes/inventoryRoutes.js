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

// 1. View Inventory
router.get('/', getInventory);
router.get('/tanks', getInventory);

// 2. Low Stock Alert
router.get('/alerts', getLowStockAlerts);
router.get('/low-stock', getLowStockAlerts);

// 3. Refill Request
router.post('/refill', requestRefill);
router.post('/refill-request', requestRefill);
router.get('/refills', getRefillHistory);
router.get('/refill-history', getRefillHistory);

// Stock availability check
router.get('/check-stock', checkStock);

// 4. Update Inventory / Single Item View
router.get('/:id', getInventoryById);
router.put('/:id', updateInventory);
router.patch('/:id', updateInventory);
router.put('/tanks/:id', updateInventory);

module.exports = router;
