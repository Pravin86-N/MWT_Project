const Order = require('../models/Order');
const Tank = require('../models/Tank');
const FuelPricing = require('../models/FuelPricing');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logActivity } = require('./activityController');

// Helper to calculate pricing
const calculateOrderPricing = async (fuelType, quantity) => {
  const code = (fuelType || 'DSL').toUpperCase();
  const fallbackPrices = {
    DSL: 92.4,
    PTL: 104.8,
    LPG: 61.2,
    KRS: 74.6,
  };

  const pricingDoc = await FuelPricing.findOne({ code });
  const unitPrice = pricingDoc
    ? pricingDoc.price
    : fallbackPrices[code] || 90.0;
  const taxRate = pricingDoc ? pricingDoc.taxRate : 0.18;
  const deliveryCharge = pricingDoc ? pricingDoc.deliveryCharge : 250;

  const subtotal = Math.round(unitPrice * quantity * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax + deliveryCharge) * 100) / 100;

  return { subtotal, tax, deliveryCharge, total };
};

// Generate order number: ORD-YYMMDD-XXX
const generateOrderNumber = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `ORD-${yy}${mm}${dd}`;

  const countToday = await Order.countDocuments({
    orderNumber: new RegExp(`^${prefix}`),
  });

  const seq = String(countToday + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
};

// @desc    Customer creates a new fuel order (appears in Depot Manager dashboard)
// @route   POST /api/orders
// @access  Public / Customer
const createOrder = async (req, res, next) => {
  try {
    const {
      customerId,
      customer,
      fuelType,
      fuelCode,
      quantity,
      qty,
      deliveryAddress,
      site,
      city,
      slot,
      notes,
    } = req.body;

    const selectedFuel = fuelType || fuelCode;
    const selectedQty = quantity != null ? Number(quantity) : Number(qty);
    const selectedAddress = deliveryAddress || site;

    if (!selectedFuel || !selectedQty || !selectedAddress) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide all required order fields: fuelType, quantity, and deliveryAddress',
      });
    }

    if (selectedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order quantity must be greater than 0 litres',
      });
    }

    // Determine customer identification
    let custId = customerId || (req.user ? req.user._id : null);
    let customerName = customer || (req.user ? req.user.name : 'Customer');

    if (custId && (!customer || customer === 'Customer')) {
      const userDoc = await User.findById(custId);
      if (userDoc) {
        customerName = userDoc.name;
      }
    }

    const orderNumber = req.body.orderNumber || (await generateOrderNumber());
    const pricing = await calculateOrderPricing(selectedFuel, selectedQty);

    const order = await Order.create({
      orderNumber,
      customerId: custId,
      customer: customerName,
      fuelType: selectedFuel.toUpperCase(),
      fuelCode: selectedFuel.toUpperCase(),
      quantity: selectedQty,
      qty: selectedQty,
      deliveryAddress: selectedAddress.trim(),
      site: selectedAddress.trim(),
      city: city || (req.user ? req.user.city : 'Chennai') || 'Chennai',
      slot: slot || '08:00-10:00',
      status: 'Pending', // Customer creates order; initially Pending for Depot Manager
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      deliveryCharge: pricing.deliveryCharge,
      total: pricing.total,
      notes: notes || '',
    });

    // Create Notification for Depot Manager & Admin
    try {
      await Notification.create({
        title: 'New Fuel Order Received',
        message: `New bulk fuel request #${order.orderNumber} from ${order.customer} for ${order.quantity} L ${order.fuelType} awaiting manager approval.`,
        category: 'request',
        role: 'Depot Manager',
        type: 'info',
        orderId: order.orderNumber,
      });
    } catch (notifErr) {
      console.warn('[Notification Error]:', notifErr.message);
    }

    // Log Activity
    logActivity({
      action: 'Order Created',
      userId: custId,
      userName: customerName,
      userRole: req.user?.role || 'Customer',
      entityId: order.orderNumber,
      details: `${customerName} created order #${order.orderNumber} for ${order.quantity} L of ${order.fuelType}`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      metadata: { fuelType: order.fuelType, quantity: order.quantity, total: order.total },
    });

    res.status(201).json({
      success: true,
      message:
        'Fuel order created successfully. Order is now pending Depot Manager review.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (with filters for Depot Manager dashboard and Customers)
// @route   GET /api/orders
// @access  Public / Protected
const getOrders = async (req, res, next) => {
  try {
    const { status, customerId, customer, fuelType, search } = req.query;
    const filter = {};

    if (status) {
      if (status === 'In Transit' || status === 'InTransit') {
        filter.status = { $in: ['In Transit', 'InTransit'] };
      } else {
        filter.status = status;
      }
    }

    if (customerId) filter.customerId = customerId;
    if (customer) filter.customer = new RegExp(customer, 'i');
    if (fuelType) {
      filter.$or = [
        { fuelType: fuelType.toUpperCase() },
        { fuelCode: fuelType.toUpperCase() },
      ];
    }

    if (search) {
      filter.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { customer: new RegExp(search, 'i') },
        { deliveryAddress: new RegExp(search, 'i') },
        { site: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending orders awaiting Depot Manager approval
// @route   GET /api/orders/pending
// @access  Protected (Depot Manager, Admin)
const getPendingOrders = async (req, res, next) => {
  try {
    const pendingOrders = await Order.find({ status: 'Pending' }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: pendingOrders.length,
      data: pendingOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery queue (approved orders moving to delivery)
// @route   GET /api/orders/delivery-queue
// @access  Protected (Depot Manager, Admin)
const getDeliveryQueue = async (req, res, next) => {
  try {
    const queueOrders = await Order.find({
      status: {
        $in: [
          'Approved',
          'Assigned',
          'In Transit',
          'InTransit',
          'Dispatched',
        ],
      },
    }).sort({ approvedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queueOrders.length,
      data: queueOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID or orderNumber
// @route   GET /api/orders/:id
// @access  Public / Protected
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let order;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Depot Manager approves order -> moves to delivery queue
// @route   PATCH /api/orders/:id/approve
// @access  Protected (Depot Manager, Admin)
const approveOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve order currently in '${order.status}' status. Only Pending orders can be approved.`,
      });
    }

    // Check inventory stock in depot tank
    const fuelCode = (order.fuelType || order.fuelCode || 'DSL').toUpperCase();
    const tank = await Tank.findOne({ fuelCode });

    if (tank) {
      const available = tank.current - (tank.reserved || 0);
      const reqQty = order.quantity || order.qty;
      if (available < reqQty) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve order: Insufficient stock in depot tank for ${fuelCode}. Available unreserved: ${available.toLocaleString()} L, Requested: ${reqQty.toLocaleString()} L`,
        });
      }

      // Reserve stock for delivery queue
      tank.reserved = (tank.reserved || 0) + reqQty;
      await tank.save();
    }

    order.status = 'Approved';
    order.approvedAt = new Date();
    await order.save();

    // Create Notification for Customer & Driver
    try {
      await Notification.create({
        title: 'Order Approved',
        message: `Your fuel order #${order.orderNumber} (${order.quantity.toLocaleString()} L ${order.fuelType}) has been approved by the depot manager.`,
        category: 'order',
        role: 'Customer',
        type: 'success',
        orderId: order.orderNumber,
      });
    } catch (notifErr) {
      console.warn('[Notification Error]:', notifErr.message);
    }

    // Log Activity
    logActivity({
      action: 'Order Approved',
      userId: req.user?._id || null,
      userName: req.user?.name || 'Depot Manager',
      userRole: req.user?.role || 'Depot Manager',
      entityId: order.orderNumber,
      details: `Order #${order.orderNumber} (${order.customer}) approved and inventory reserved (${order.quantity} L ${order.fuelType})`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} approved successfully and moved to the delivery queue.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Depot Manager rejects order
// @route   PATCH /api/orders/:id/reject
// @access  Protected (Depot Manager, Admin)
const rejectOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, rejectionReason } = req.body;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'Pending' && order.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject order currently in '${order.status}' status.`,
      });
    }

    // If order had already reserved stock, release reservation
    if (order.status === 'Approved') {
      const fuelCode = (order.fuelType || order.fuelCode || 'DSL').toUpperCase();
      const tank = await Tank.findOne({ fuelCode });
      if (tank) {
        tank.reserved = Math.max(0, (tank.reserved || 0) - (order.quantity || order.qty));
        await tank.save();
      }
    }

    const finalReason = reason || rejectionReason || 'Rejected by Depot Manager';
    order.status = 'Rejected';
    order.rejectedAt = new Date();
    order.rejectionReason = finalReason;
    await order.save();

    // Log Activity
    logActivity({
      action: 'Order Rejected',
      userId: req.user?._id || null,
      userName: req.user?.name || 'Depot Manager',
      userRole: req.user?.role || 'Depot Manager',
      entityId: order.orderNumber,
      details: `Order #${order.orderNumber} was rejected. Reason: ${finalReason}`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} rejected. Reason: ${finalReason}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign driver & vehicle to approved order in delivery queue
// @route   PATCH /api/orders/:id/assign
// @access  Protected (Depot Manager, Admin)
const assignOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = req.body.driver || req.body.driverName;
    const vehicle = req.body.vehicle || req.body.vehicleNumber;

    if (!driver || !vehicle) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both driver and vehicle for assignment',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['Approved', 'Assigned', 'Dispatched'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign order in '${order.status}' status. Order must be Approved first.`,
      });
    }

    order.driver = driver;
    order.vehicle = vehicle;
    order.status = 'Assigned';
    order.assignedAt = new Date();
    await order.save();

    // Create Notification for Driver and Customer
    try {
      await Notification.create({
        title: 'Driver Assigned',
        message: `Driver ${driver} and Tanker ${vehicle} assigned to Order #${order.orderNumber} (${order.customer}).`,
        category: 'dispatch',
        role: 'Driver',
        type: 'info',
        orderId: order.orderNumber,
      });
      await Notification.create({
        title: 'Driver Assigned to Order',
        message: `Driver ${driver} has been assigned to deliver your Order #${order.orderNumber}.`,
        category: 'dispatch',
        role: 'Customer',
        type: 'info',
        orderId: order.orderNumber,
      });
    } catch (notifErr) {
      console.warn('[Notification Error]:', notifErr.message);
    }

    // Log Activity
    logActivity({
      action: 'Driver Assigned',
      userId: req.user?._id || null,
      userName: req.user?.name || 'Depot Manager',
      userRole: req.user?.role || 'Depot Manager',
      entityId: order.orderNumber,
      details: `Driver ${driver} and Tanker ${vehicle} assigned to Order #${order.orderNumber} (${order.customer})`,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      metadata: { driver, vehicle },
    });

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} assigned to driver ${driver} with vehicle ${vehicle}.`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (handles full workflow transitions)
// @route   PATCH /api/orders/:id/status
// @access  Protected (Depot Manager, Admin, Driver)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, driver, vehicle, reason, rejectionReason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = order.status;
    const nextStatus = status;

    const validStatuses = [
      'Pending',
      'Approved',
      'Rejected',
      'Assigned',
      'In Transit',
      'InTransit',
      'Dispatched',
      'Delivered',
      'Cancelled',
    ];

    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${nextStatus}'. Allowed: Pending, Approved, Rejected, Assigned, In Transit, Delivered`,
      });
    }

    const fuelCode = (order.fuelType || order.fuelCode || 'DSL').toUpperCase();
    const orderQty = order.quantity || order.qty;
    const tank = await Tank.findOne({ fuelCode });

    // Workflow hook 1: Approving
    if (nextStatus === 'Approved' && currentStatus !== 'Approved') {
      if (tank) {
        const available = tank.current - (tank.reserved || 0);
        if (available < orderQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient available stock in depot tank for ${fuelCode}. Available: ${available.toLocaleString()} L, Requested: ${orderQty.toLocaleString()} L`,
          });
        }
        tank.reserved = (tank.reserved || 0) + orderQty;
        await tank.save();
      }
      order.approvedAt = new Date();
    }

    // Workflow hook 2: Rejecting / Cancelling
    if (
      (nextStatus === 'Rejected' || nextStatus === 'Cancelled') &&
      ['Approved', 'Assigned', 'In Transit', 'InTransit', 'Dispatched'].includes(currentStatus)
    ) {
      if (tank) {
        tank.reserved = Math.max(0, (tank.reserved || 0) - orderQty);
        await tank.save();
      }
      if (nextStatus === 'Rejected') {
        order.rejectedAt = new Date();
        order.rejectionReason = reason || rejectionReason || 'Rejected';
      }
    }

    // Workflow hook 3: Assigning
    if (nextStatus === 'Assigned') {
      order.assignedAt = new Date();
    }

    // Workflow hook 4: Delivered
    if (nextStatus === 'Delivered' && currentStatus !== 'Delivered') {
      if (tank) {
        tank.current = Math.max(0, tank.current - orderQty);
        tank.reserved = Math.max(0, (tank.reserved || 0) - orderQty);
        await tank.save();
      }
      order.deliveredAt = new Date();
    }

    order.status = nextStatus;
    if (driver) order.driver = driver;
    if (vehicle) order.vehicle = vehicle;
    if (req.body.customerSignature) order.customerSignature = req.body.customerSignature;
    if (req.body.deliveryProof) order.deliveryProof = req.body.deliveryProof;
    if (req.body.reachedAt) order.reachedAt = req.body.reachedAt;

    await order.save();

    // Create automated notifications on delivery start / delivered
    try {
      if (nextStatus === 'In Transit' || nextStatus === 'InTransit' || nextStatus === 'Dispatched') {
        await Notification.create({
          title: 'Delivery Started',
          message: `Tanker dispatched! Order #${order.orderNumber} is now IN TRANSIT to ${order.deliveryAddress}.`,
          category: 'delivery',
          role: 'Customer',
          type: 'info',
          orderId: order.orderNumber,
        });
      } else if (nextStatus === 'Delivered') {
        await Notification.create({
          title: 'Delivery Delivered',
          message: `Order #${order.orderNumber} (${order.quantity.toLocaleString()} L ${order.fuelType}) was successfully DELIVERED to ${order.deliveryAddress}.`,
          category: 'delivery',
          role: 'Customer',
          type: 'success',
          orderId: order.orderNumber,
        });
        await Notification.create({
          title: 'Delivery Completed',
          message: `Driver ${order.driver} completed delivery for Order #${order.orderNumber} at ${order.customer}.`,
          category: 'delivery',
          role: 'Depot Manager',
          type: 'success',
          orderId: order.orderNumber,
        });
      }
    } catch (notifErr) {
      console.warn('[Notification Error]:', notifErr.message);
    }

    // Log Activity for status transitions
    if (nextStatus === 'In Transit' || nextStatus === 'InTransit' || nextStatus === 'Dispatched') {
      logActivity({
        action: 'Delivery Started',
        userId: req.user?._id || null,
        userName: req.user?.name || order.driver || 'Driver',
        userRole: req.user?.role || 'Driver',
        entityId: order.orderNumber,
        details: `Delivery started for Order #${order.orderNumber}. Tanker en-route to ${order.deliveryAddress}. Driver: ${order.driver}`,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
        metadata: { driver: order.driver, vehicle: order.vehicle },
      });
    } else if (nextStatus === 'Delivered') {
      logActivity({
        action: 'Delivery Completed',
        userId: req.user?._id || null,
        userName: req.user?.name || order.driver || 'Driver',
        userRole: req.user?.role || 'Driver',
        entityId: order.orderNumber,
        details: `Order #${order.orderNumber} delivered to ${order.customer} at ${order.deliveryAddress}. Inventory deducted.`,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
        metadata: { driver: order.driver, vehicle: order.vehicle, quantity: order.quantity },
      });
    } else if (nextStatus === 'Approved') {
      logActivity({
        action: 'Order Approved',
        userId: req.user?._id || null,
        userName: req.user?.name || 'Depot Manager',
        userRole: req.user?.role || 'Depot Manager',
        entityId: order.orderNumber,
        details: `Order #${order.orderNumber} approved.`,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${nextStatus}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order details
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const selectedFuel = req.body.fuelType || req.body.fuelCode || order.fuelType;
    const selectedQty = req.body.quantity || req.body.qty || order.quantity;

    if (req.body.quantity || req.body.qty || req.body.fuelType || req.body.fuelCode) {
      const pricing = await calculateOrderPricing(selectedFuel, Number(selectedQty));
      req.body.subtotal = pricing.subtotal;
      req.body.tax = pricing.tax;
      req.body.total = pricing.total;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Admin, Depot Manager)
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['Approved', 'Assigned', 'In Transit', 'InTransit', 'Dispatched'].includes(order.status)) {
      const fuelCode = (order.fuelType || order.fuelCode || 'DSL').toUpperCase();
      const tank = await Tank.findOne({ fuelCode });
      if (tank) {
        tank.reserved = Math.max(0, (tank.reserved || 0) - (order.quantity || order.qty));
        await tank.save();
      }
    }

    await Order.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order tax invoice & billing summary
// @route   GET /api/orders/:id/invoice
// @access  Public / Protected
const getOrderInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    let order;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const fuelCode = (order.fuelType || order.fuelCode || 'DSL').toUpperCase();
    const pricing = await calculateOrderPricing(fuelCode, order.quantity || order.qty);
    const pricingDoc = await FuelPricing.findOne({ code: fuelCode });

    const invoice = {
      invoiceNumber: `INV-${order.orderNumber}`,
      date: order.createdAt || new Date(),
      orderNumber: order.orderNumber,
      customer: {
        name: order.customer,
        deliverySite: order.deliveryAddress || order.site,
        city: order.city,
        paymentTerms: 'Corporate NET 30 Days',
      },
      dispatch: {
        driver: order.driver || 'Unassigned',
        vehicle: order.vehicle || 'Unassigned',
        status: order.status,
        slot: order.slot,
        depot: 'Central Depot Logistics Vault #1',
        deliveredAt: order.deliveredAt || null,
        reachedAt: order.reachedAt || null,
        customerSignature: order.customerSignature || '',
      },
      item: {
        fuelCode,
        fuelName: pricingDoc ? pricingDoc.name : (fuelCode === 'DSL' ? 'High Speed Diesel' : fuelCode === 'PTL' ? 'Super Petrol' : fuelCode),
        quantity: order.quantity || order.qty,
        unitPrice: pricingDoc ? pricingDoc.price : 92.4,
        subtotal: order.subtotal || pricing.subtotal,
        taxRate: pricingDoc ? pricingDoc.taxRate : 0.18,
        tax: order.tax || pricing.tax,
        deliveryCharge: order.deliveryCharge || pricing.deliveryCharge,
        total: order.total || pricing.total,
      },
      taxDetails: {
        depotGstin: '33AAACF1234H1Z8',
        companyName: 'FDMS DEPOT LOGISTICS LTD.',
        address: '100 GST Road, Guindy Industrial Estate, Chennai - 600032',
      },
    };

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
