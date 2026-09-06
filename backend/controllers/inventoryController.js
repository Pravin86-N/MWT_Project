const Inventory = require('../models/Inventory');

// @desc    View all depot inventory tanks
// @route   GET /api/inventory (or GET /api/inventory/tanks)
// @access  Public / Protected
const getInventory = async (req, res, next) => {
  try {
    const { fuelType } = req.query;
    const filter = {};

    if (fuelType) {
      filter.$or = [
        { fuelType: fuelType.toUpperCase() },
        { fuelCode: fuelType.toUpperCase() },
      ];
    }

    const items = await Inventory.find(filter).sort({ fuelType: 1, fuelCode: 1 });

    const enrichedInventory = items.map((item) => {
      const obj = item.toObject();
      const stock = obj.currentStock != null ? obj.currentStock : obj.current;
      const thresh = obj.minimumThreshold != null ? obj.minimumThreshold : obj.threshold;
      obj.availableStock = Math.max(0, stock - (obj.reserved || 0));
      obj.available = obj.availableStock;
      obj.isLowStock = stock <= thresh;
      obj.fillPercentage = obj.capacity > 0 ? Math.round((stock / obj.capacity) * 100) : 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enrichedInventory.length,
      data: enrichedInventory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory item by ID, tankId, or fuelType
// @route   GET /api/inventory/:id
// @access  Public / Protected
const getInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let item;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      item = await Inventory.findById(id);
    } else {
      item = await Inventory.findOne({
        $or: [
          { tankId: id },
          { fuelType: id.toUpperCase() },
          { fuelCode: id.toUpperCase() },
        ],
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Inventory item '${id}' not found`,
      });
    }

    const obj = item.toObject();
    const stock = obj.currentStock != null ? obj.currentStock : obj.current;
    const thresh = obj.minimumThreshold != null ? obj.minimumThreshold : obj.threshold;
    obj.availableStock = Math.max(0, stock - (obj.reserved || 0));
    obj.available = obj.availableStock;
    obj.isLowStock = stock <= thresh;
    obj.fillPercentage = obj.capacity > 0 ? Math.round((stock / obj.capacity) * 100) : 0;

    res.status(200).json({
      success: true,
      data: obj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory details (currentStock, capacity, minimumThreshold)
// @route   PUT /api/inventory/:id (or PATCH /api/inventory/:id)
// @access  Protected (Admin, Depot Manager)
const updateInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    let item;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      item = await Inventory.findById(id);
    } else {
      item = await Inventory.findOne({
        $or: [
          { tankId: id },
          { fuelType: id.toUpperCase() },
          { fuelCode: id.toUpperCase() },
        ],
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory tank not found',
      });
    }

    // Process field updates and aliases
    const updatedStock = req.body.currentStock != null ? Number(req.body.currentStock) : (req.body.current != null ? Number(req.body.current) : item.currentStock);
    const updatedCapacity = req.body.capacity != null ? Number(req.body.capacity) : item.capacity;
    const updatedThreshold = req.body.minimumThreshold != null ? Number(req.body.minimumThreshold) : (req.body.threshold != null ? Number(req.body.threshold) : item.minimumThreshold);

    if (updatedStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current stock cannot be negative',
      });
    }

    if (updatedCapacity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity cannot be negative',
      });
    }

    if (updatedStock > updatedCapacity) {
      return res.status(400).json({
        success: false,
        message: `Current stock (${updatedStock} L) cannot exceed tank capacity (${updatedCapacity} L)`,
      });
    }

    item.currentStock = updatedStock;
    item.current = updatedStock;
    item.capacity = updatedCapacity;
    item.minimumThreshold = updatedThreshold;
    item.threshold = updatedThreshold;

    if (req.body.temp != null) item.temp = Number(req.body.temp);
    if (req.body.pressure != null) item.pressure = Number(req.body.pressure);
    if (req.body.reserved != null) item.reserved = Number(req.body.reserved);

    await item.save();

    const obj = item.toObject();
    obj.availableStock = Math.max(0, obj.currentStock - (obj.reserved || 0));
    obj.isLowStock = obj.currentStock <= obj.minimumThreshold;
    obj.fillPercentage = Math.round((obj.currentStock / obj.capacity) * 100);

    res.status(200).json({
      success: true,
      message: 'Depot inventory updated successfully',
      data: obj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Low Stock Alert: Get all tanks below or equal to minimum threshold
// @route   GET /api/inventory/alerts (or GET /api/inventory/low-stock)
// @access  Public / Protected
const getLowStockAlerts = async (req, res, next) => {
  try {
    const items = await Inventory.find({});

    const alerts = [];
    items.forEach((item) => {
      const stock = item.currentStock != null ? item.currentStock : item.current;
      const thresh = item.minimumThreshold != null ? item.minimumThreshold : item.threshold;

      if (stock <= thresh) {
        const deficit = Math.max(0, thresh - stock);
        const recommendedRefill = Math.max(0, item.capacity - stock);
        const severity = stock <= thresh * 0.5 ? 'CRITICAL' : 'WARNING';

        alerts.push({
          tankId: item.tankId,
          name: item.name,
          fuelType: item.fuelType || item.fuelCode,
          currentStock: stock,
          minimumThreshold: thresh,
          capacity: item.capacity,
          deficit,
          recommendedRefill,
          fillPercentage: Math.round((stock / item.capacity) * 100),
          severity,
          alert: severity === 'CRITICAL' ? 'CRITICAL LOW STOCK' : 'LOW STOCK ALERT',
          message: `Stock for ${item.fuelType || item.fuelCode} (${stock.toLocaleString()} L) has breached minimum threshold (${thresh.toLocaleString()} L). Refill recommended.`,
          timestamp: new Date(),
        });
      }
    });

    res.status(200).json({
      success: true,
      alertCount: alerts.length,
      hasLowStock: alerts.length > 0,
      alerts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refill Request: Process tank refill and record refill history
// @route   POST /api/inventory/refill (or POST /api/inventory/refill-request)
// @access  Protected (Admin, Depot Manager)
const requestRefill = async (req, res, next) => {
  try {
    const {
      tankId,
      fuelType,
      fuelCode,
      quantity,
      amount,
      requestedBy,
      supplier,
      notes,
    } = req.body;

    const targetFuel = fuelType || fuelCode;
    const refillQty = quantity != null ? Number(quantity) : (amount != null ? Number(amount) : 10000);

    if (refillQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refill quantity must be greater than 0 litres',
      });
    }

    let item;
    if (tankId) {
      item = await Inventory.findOne({ tankId });
    } else if (targetFuel) {
      item = await Inventory.findOne({
        $or: [
          { fuelType: targetFuel.toUpperCase() },
          { fuelCode: targetFuel.toUpperCase() },
        ],
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Inventory tank not found for refill. Please provide a valid tankId or fuelType`,
      });
    }

    const currentStock = item.currentStock != null ? item.currentStock : item.current;
    const newStock = Math.min(item.capacity, currentStock + refillQty);
    const addedActual = newStock - currentStock;

    item.currentStock = newStock;
    item.current = newStock;
    item.lastRefill = new Date().toISOString().split('T')[0];

    const refillRecord = {
      quantity: refillQty,
      requestedBy: requestedBy || 'Depot Manager',
      supplier: supplier || 'Indian Oil Corporation',
      status: 'Completed',
      notes: notes || `Depot refill of ${refillQty.toLocaleString()} L`,
      refillDate: new Date(),
    };

    item.refillHistory.push(refillRecord);
    await item.save();

    const obj = item.toObject();
    obj.availableStock = Math.max(0, obj.currentStock - (obj.reserved || 0));
    obj.isLowStock = obj.currentStock <= obj.minimumThreshold;
    obj.fillPercentage = Math.round((obj.currentStock / obj.capacity) * 100);

    res.status(200).json({
      success: true,
      message: `Refill of ${refillQty.toLocaleString()} L processed successfully for ${item.name}. New Stock: ${newStock.toLocaleString()} L`,
      data: obj,
      refill: refillRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get refill requests & historical logs across all depot tanks
// @route   GET /api/inventory/refills (or GET /api/inventory/refill-history)
// @access  Public / Protected
const getRefillHistory = async (req, res, next) => {
  try {
    const items = await Inventory.find({}).sort({ updatedAt: -1 });

    const allRefills = [];
    items.forEach((item) => {
      (item.refillHistory || []).forEach((refill) => {
        allRefills.push({
          tankId: item.tankId,
          name: item.name,
          fuelType: item.fuelType || item.fuelCode,
          ...refill.toObject(),
        });
      });
    });

    allRefills.sort((a, b) => new Date(b.refillDate) - new Date(a.refillDate));

    res.status(200).json({
      success: true,
      count: allRefills.length,
      data: allRefills,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check stock availability for order creation
// @route   GET /api/inventory/check-stock
// @access  Public
const checkStock = async (req, res, next) => {
  try {
    const { fuelCode, fuelType, amount, quantity } = req.query;
    const targetFuel = fuelCode || fuelType;
    const requestedAmount = amount != null ? Number(amount) : (quantity != null ? Number(quantity) : 0);

    if (!targetFuel || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid fuelCode/fuelType and requested amount in litres',
      });
    }

    const item = await Inventory.findOne({
      $or: [
        { fuelType: targetFuel.toUpperCase() },
        { fuelCode: targetFuel.toUpperCase() },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Depot tank for ${targetFuel} not found`,
        sufficient: false,
      });
    }

    const stock = item.currentStock != null ? item.currentStock : item.current;
    const available = Math.max(0, stock - (item.reserved || 0));
    const sufficient = available >= requestedAmount;

    res.status(200).json({
      success: true,
      fuelType: item.fuelType || item.fuelCode,
      tankName: item.name,
      currentStock: stock,
      reserved: item.reserved || 0,
      availableStock: available,
      requestedAmount,
      sufficient,
      isLowStock: stock <= (item.minimumThreshold || item.threshold),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  updateInventory,
  getLowStockAlerts,
  requestRefill,
  getRefillHistory,
  checkStock,
  // Aliases for backward compatibility
  getTanks: getInventory,
  updateTank: updateInventory,
  refillTank: requestRefill,
};
