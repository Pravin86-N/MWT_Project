const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Tank = require('../models/Tank');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const CustomerRegistration = require('../models/CustomerRegistration');

// @desc    Generate full reports suite (KPIs + Customer, Order, Delivery, Inventory tables)
// @route   GET /api/reports/summary, GET /api/reports, GET /api/reports/dashboard
// @access  Public / Protected
const getReportsSummary = async (req, res, next) => {
  try {
    console.log('[FDMS Backend] Compiling comprehensive reports from MongoDB collections...');

    const [orders, drivers, tanks, vehicles, users, registrations] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }),
      Driver.find({}),
      Tank.find({}),
      Vehicle.find({}),
      User.find({}),
      CustomerRegistration.find({}).sort({ createdAt: -1 }),
    ]);

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'Delivered');
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled' || o.status === 'Rejected');
    const activeOrders = orders.filter(
      (o) =>
        o.status === 'In Transit' ||
        o.status === 'InTransit' ||
        o.status === 'Dispatched' ||
        o.status === 'Assigned'
    );
    const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'Pending Approval');

    const totalDeliveredLitres = completedOrders.reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);
    const totalRevenue = orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalSubtotal = orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.subtotal || 0), 0);

    const totalTax = orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.tax || 0), 0);

    const totalDeliveryCharges = orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.deliveryCharge || 250), 0);

    const lostRevenue = cancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const lostLitres = cancelledOrders.reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);

    const nonPending = orders.filter((o) => o.status !== 'Pending' && o.status !== 'Pending Approval');
    const successRate = nonPending.length > 0 ? Math.round((completedOrders.length / nonPending.length) * 100) : 100;

    // Daily Calculations (Today)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfToday);
    const todayDeliveredOrders = todayOrders.filter((o) => o.status === 'Delivered');
    const todayLitres = todayOrders.reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);
    const todayRevenue = todayOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    // Weekly Calculations (Last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyOrders = orders.filter((o) => new Date(o.createdAt) >= sevenDaysAgo);
    const weeklyLitres = weeklyOrders.reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);
    const weeklyRevenue = weeklyOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    // Monthly Trends (computed dynamically from orders)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};

    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = { month: key, volume: 0, revenue: 0, count: 0 };
    }

    orders.forEach((o) => {
      const d = new Date(o.createdAt || Date.now());
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, volume: 0, revenue: 0, count: 0 };
      }
      monthlyMap[key].count += 1;
      if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
        monthlyMap[key].volume += o.quantity || o.qty || 0;
        monthlyMap[key].revenue += o.total || 0;
      }
    });

    const monthlyTrends = Object.values(monthlyMap);

    // Fuel Type breakdown
    const fuelStats = {};
    orders.forEach((o) => {
      const code = (o.fuelType || o.fuelCode || 'DSL').toUpperCase();
      if (!fuelStats[code]) {
        fuelStats[code] = { code, litres: 0, revenue: 0, count: 0 };
      }
      fuelStats[code].count += 1;
      if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
        fuelStats[code].litres += o.quantity || o.qty || 0;
        fuelStats[code].revenue += o.total || 0;
      }
    });

    // Customer Leaderboard & customer aggregation
    const customerStats = {};
    orders.forEach((o) => {
      if (o.status === 'Cancelled' || o.status === 'Rejected') return;
      const cust = o.customer || 'Customer';
      if (!customerStats[cust]) {
        customerStats[cust] = { name: cust, litres: 0, revenue: 0, ordersCount: 0, city: o.city || 'Chennai' };
      }
      customerStats[cust].litres += o.quantity || o.qty || 0;
      customerStats[cust].revenue += o.total || 0;
      customerStats[cust].ordersCount += 1;
    });

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Driver Performance
    const driverPerformance = drivers.map((d) => {
      const deliveredCount = orders.filter((o) => o.driver === d.name && o.status === 'Delivered').length;
      const activeCount = orders.filter(
        (o) =>
          o.driver === d.name &&
          (o.status === 'In Transit' || o.status === 'InTransit' || o.status === 'Dispatched')
      ).length;
      return {
        id: d._id,
        name: d.name,
        phone: d.phone,
        vehicle: d.vehicle,
        onDuty: d.onDuty,
        deliveriesCompleted: d.deliveries || deliveredCount,
        activeOrders: activeCount,
        rating: 4.9,
      };
    });

    // Tank Telemetry Metrics
    const totalCapacity = tanks.reduce((sum, t) => sum + (t.capacity || 0), 0);
    const totalCurrentStock = tanks.reduce(
      (sum, t) => sum + (t.currentStock != null ? t.currentStock : t.current || 0),
      0
    );
    const totalReservedStock = tanks.reduce((sum, t) => sum + (t.reserved || 0), 0);
    const lowStockTanks = tanks.filter(
      (t) =>
        (t.currentStock != null ? t.currentStock : t.current) <=
        (t.minimumThreshold != null ? t.minimumThreshold : t.threshold)
    );

    /* =========================================================================
       ISSUE 5: DEDICATED REPORT TABLE GENERATION FROM MONGODB
       ========================================================================= */

    // 1. CUSTOMER REPORT (Table)
    const customerReportMap = new Map();

    // Seed with registrations
    registrations.forEach((r) => {
      const key = (r.companyName || '').toLowerCase().trim();
      if (!key) return;
      customerReportMap.set(key, {
        id: r.regId || r._id,
        customer: r.companyName,
        contactPerson: r.authorizedPerson || r.contactPerson || 'Authorized Rep',
        email: r.email || '—',
        phone: r.phone || r.mobile || '—',
        city: r.city || 'Chennai',
        ordersCount: 0,
        totalLitres: 0,
        totalRevenue: 0,
        status: r.status === 'Approved' ? 'Active' : r.status || 'Pending Review',
        lastOrder: 'None',
      });
    });

    // Merge orders into customer report
    orders.forEach((o) => {
      const key = (o.customer || '').toLowerCase().trim();
      if (!key) return;

      let entry = customerReportMap.get(key);
      if (!entry) {
        entry = {
          id: `CUST-${o._id.toString().slice(-6)}`,
          customer: o.customer,
          contactPerson: 'Procurement Officer',
          email: '—',
          phone: '—',
          city: o.city || 'Chennai',
          ordersCount: 0,
          totalLitres: 0,
          totalRevenue: 0,
          status: 'Active',
          lastOrder: 'None',
        };
        customerReportMap.set(key, entry);
      }

      entry.ordersCount += 1;
      if (o.status !== 'Cancelled' && o.status !== 'Rejected') {
        entry.totalLitres += o.quantity || o.qty || 0;
        entry.totalRevenue += o.total || 0;
      }
      if (entry.lastOrder === 'None' && o.orderNumber) {
        entry.lastOrder = `${o.orderNumber} (${o.status})`;
      }
    });

    const customerReport = Array.from(customerReportMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    // 2. ORDER REPORT (Table)
    const orderReport = orders.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      fuelType: o.fuelType || o.fuelCode || 'DSL',
      quantity: o.quantity || o.qty || 0,
      subtotal: o.subtotal || 0,
      tax: o.tax || 0,
      deliveryCharge: o.deliveryCharge || 250,
      total: o.total || 0,
      status: o.status,
      city: o.city || 'Chennai',
      slot: o.slot || 'Standard',
      driver: o.driver || 'Unassigned',
      vehicle: o.vehicle || 'Unassigned',
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '—',
    }));

    // 3. DELIVERY REPORT (Table)
    const deliveryReport = orders
      .filter((o) =>
        ['Delivered', 'In Transit', 'InTransit', 'Dispatched', 'Assigned'].includes(o.status)
      )
      .map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        driver: o.driver || 'Unassigned',
        vehicle: o.vehicle || 'Unassigned',
        destination: o.deliveryAddress || o.site || o.city || 'Chennai',
        city: o.city || 'Chennai',
        fuelType: o.fuelType || o.fuelCode || 'DSL',
        quantity: o.quantity || o.qty || 0,
        status: o.status,
        slot: o.slot || '08:00-10:00',
        deliveryProof: o.deliveryProof ? 'Verified Meter' : 'Pending',
        customerSignature: o.customerSignature ? 'Signed' : 'Pending',
        completedDate: o.status === 'Delivered' ? (o.updatedAt ? new Date(o.updatedAt).toISOString().split('T')[0] : 'Delivered') : 'In Progress',
      }));

    // 4. FUEL INVENTORY REPORT (Table)
    const fuelInventoryReport = tanks.map((t) => {
      const current = t.currentStock != null ? t.currentStock : t.current || 0;
      const capacity = t.capacity || 1;
      const fillPct = Math.round((current / capacity) * 100);
      const threshold = t.minimumThreshold != null ? t.minimumThreshold : t.threshold || 5000;
      const isLowStock = current <= threshold;

      return {
        id: t._id,
        tankId: t.tankId || `TK-${t.fuelCode || 'DSL'}`,
        name: t.name || `${t.fuelType || t.fuelCode} Vault`,
        fuelType: t.fuelType || t.fuelCode || 'DSL',
        currentStock: current,
        capacity,
        threshold,
        fillPercentage: fillPct,
        status: isLowStock ? 'Low Stock Warning' : 'Optimal',
        temp: t.temp || 24.5,
        pressure: t.pressure || 1.02,
        lastRefill: t.lastRefill || 'Recent',
      };
    });

    const responsePayload = {
      success: true,
      data: {
        kpis: {
          totalOrders,
          completedOrdersCount: completedOrders.length,
          activeOrdersCount: activeOrders.length,
          pendingOrdersCount: pendingOrders.length,
          cancelledOrdersCount: cancelledOrders.length,
          totalRevenue,
          totalSubtotal,
          totalTax,
          totalDeliveryCharges,
          lostRevenue,
          lostLitres,
          totalDeliveredLitres,
          successRate,
          totalCustomersCount: customerReport.length,
          activeCustomersCount: Object.keys(customerStats).length,
          activeDriversCount: drivers.filter((d) => d.onDuty).length,
          totalDriversCount: drivers.length,
          totalVehiclesCount: vehicles.length,
          availableVehiclesCount: vehicles.filter((v) => v.status === 'Available' || v.status === 'Idle').length,
          inTransitVehiclesCount: vehicles.filter(
            (v) => v.status === 'In Transit' || v.status === 'InTransit' || v.status === 'Delivering'
          ).length,
          inventory: {
            totalCapacity,
            totalCurrentStock,
            totalReservedStock,
            availableStock: Math.max(0, totalCurrentStock - totalReservedStock),
            utilization: totalCapacity > 0 ? Math.round((totalCurrentStock / totalCapacity) * 100) : 0,
            lowStockCount: lowStockTanks.length,
          },
        },
        daily: {
          ordersCount: todayOrders.length,
          deliveredCount: todayDeliveredOrders.length,
          litres: todayLitres,
          revenue: todayRevenue,
        },
        weekly: {
          ordersCount: weeklyOrders.length,
          litres: weeklyLitres,
          revenue: weeklyRevenue,
        },
        monthlyTrends,
        fuelTypeBreakdown: Object.values(fuelStats),
        topCustomers,
        driverPerformance,
        recentOrders: orders.slice(0, 15),

        // 4 REQUIRED MONGODB REPORT TABLES (ISSUE 5)
        reports: {
          customerReport,
          orderReport,
          deliveryReport,
          fuelInventoryReport,
        },
        customerReport,
        orderReport,
        deliveryReport,
        fuelInventoryReport,
      },
    };

    console.log(
      `[FDMS Backend] Report compiled: ${customerReport.length} customers, ${orderReport.length} orders, ${deliveryReport.length} deliveries, ${fuelInventoryReport.length} tanks.`
    );

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[FDMS Backend] Error compiling reports:', error);
    next(error);
  }
};

module.exports = {
  getReportsSummary,
  getDashboardReports: getReportsSummary,
  getReports: getReportsSummary,
};
