const CustomerRegistration = require('../models/CustomerRegistration');
const User = require('../models/User');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { logActivity } = require('./activityController');

// Helper to generate registration ID: REG-YYYY-XXX
const generateRegId = async () => {
  const year = new Date().getFullYear();
  const prefix = `REG-${year}`;
  const count = await CustomerRegistration.countDocuments({
    regId: new RegExp(`^${prefix}`),
  });
  const seq = String(900 + count + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
};

// @desc    Get all customers enriched with registrations, orders, and delivery telemetry
// @route   GET /api/customers
// @access  Public / Protected (Admin, Depot Manager)
const getCustomers = async (req, res, next) => {
  try {
    console.log('[FDMS Backend] Fetching real customer records from MongoDB...');
    const { status, search, city } = req?.query || {};

    // 1. Fetch ONLY Approved customer registrations from MongoDB
    const regFilter = { status: 'Approved' };
    if (city) regFilter.city = new RegExp(city, 'i');
    const registrations = await CustomerRegistration.find(regFilter).sort({ createdAt: -1 });

    // 2. Fetch all registered user accounts with role 'Customer' that are active and not pending/rejected
    const customerUsers = await User.find({
      role: 'Customer',
      status: { $nin: ['Pending', 'Pending Review', 'Rejected'] },
      isVerified: { $ne: false },
    }).select('-password');

    // 3. Fetch all orders from MongoDB to aggregate metrics
    const orders = await Order.find({}).sort({ createdAt: -1 });

    // Map to aggregate by normalized company/customer name
    const customerMap = new Map();

    // Index ONLY Approved registrations
    registrations.forEach((r) => {
      if (r.status !== 'Approved') return;
      const nameKey = (r.companyName || '').toLowerCase().trim();
      if (!nameKey) return;

      customerMap.set(nameKey, {
        _id: r._id,
        id: r.regId || r._id,
        regId: r.regId || '',
        name: r.companyName,
        companyName: r.companyName,
        authorizedPerson: r.authorizedPerson || r.contactPerson || 'Authorized Rep',
        contactPerson: r.contactPerson || r.authorizedPerson || 'Authorized Rep',
        email: r.email || '',
        phone: r.phone || r.mobile || '',
        mobile: r.mobile || r.phone || '',
        address: r.address || r.address1 || '',
        city: r.city || 'Chennai',
        state: r.state || 'Tamil Nadu',
        pincode: r.pincode || r.postalCode || '600001',
        gstNumber: r.gstNumber || '—',
        panNumber: r.panNumber || '—',
        businessType: r.businessType || 'Commercial Logistics',
        industry: r.businessType || 'Commercial Logistics',
        monthlyConsumption: r.monthlyConsumption || 0,
        registrationStatus: r.status || 'Pending Review',
        status: r.status === 'Approved' ? 'Active' : r.status || 'Pending Review',
        priority: (r.monthlyConsumption || 0) >= 40000 ? 'Premium' : (r.monthlyConsumption || 0) >= 20000 ? 'Gold' : 'Standard',
        credit: {
          limit: 500000,
          used: 0,
          terms: 'NET 30',
        },
        contact: {
          name: r.authorizedPerson || r.contactPerson || 'Authorized Rep',
          phone: r.phone || r.mobile || '',
          email: r.email || '',
          since: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '2026-01-01',
        },
        documents: r.documents || [],
        gstCertificate: r.gstCertificate || {},
        panCard: r.panCard || {},
        companyRegistrationCertificate: r.companyRegistrationCertificate || {},
        ordersCount: 0,
        orders: 0,
        totalQty: 0,
        litres: 0,
        revenue: 0,
        activeOrdersCount: 0,
        pendingRequestsCount: 0,
        deliveriesCount: 0,
        customerOrders: [],
        lastOrderDate: 'No orders yet',
        createdAt: r.createdAt,
      });
    });

    // Find any unapproved registrations to strictly exclude from customer list
    const unapprovedRegs = await CustomerRegistration.find({
      status: { $in: ['Pending', 'Pending Review', 'Rejected'] },
    });
    const blockedEmails = new Set(
      unapprovedRegs.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean)
    );
    const blockedNames = new Set(
      unapprovedRegs.map((r) => (r.companyName || '').toLowerCase().trim()).filter(Boolean)
    );

    // Merge customer users if explicitly approved and not unapproved
    customerUsers.forEach((u) => {
      const userEmail = (u.email || '').toLowerCase().trim();
      if (blockedEmails.has(userEmail)) return;

      const nameKey = (u.name || '').toLowerCase().trim();
      if (!nameKey || blockedNames.has(nameKey)) return;

      if (customerMap.has(nameKey)) {
        const existing = customerMap.get(nameKey);
        if (u.creditLimit) existing.credit.limit = u.creditLimit;
        if (u.creditUsed) existing.credit.used = u.creditUsed;
        if (u.city && !existing.city) existing.city = u.city;
        if (u.phone && !existing.phone) {
          existing.phone = u.phone;
          existing.contact.phone = u.phone;
        }
      } else {
        customerMap.set(nameKey, {
          _id: u._id,
          id: u._id,
          regId: '',
          name: u.name,
          companyName: u.name,
          authorizedPerson: u.name,
          contactPerson: u.name,
          email: u.email || '',
          phone: u.phone || '',
          mobile: u.phone || '',
          address: u.site || '',
          city: u.city || 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          gstNumber: '—',
          panNumber: '—',
          businessType: 'Enterprise Commercial',
          industry: 'Enterprise Commercial',
          monthlyConsumption: 25000,
          registrationStatus: 'Approved',
          status: 'Active',
          priority: 'Gold',
          credit: {
            limit: u.creditLimit || 500000,
            used: u.creditUsed || 0,
            terms: 'NET 30',
          },
          contact: {
            name: u.name,
            phone: u.phone || '',
            email: u.email || '',
            since: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-01-01',
          },
          documents: [],
          ordersCount: 0,
          orders: 0,
          totalQty: 0,
          litres: 0,
          revenue: 0,
          activeOrdersCount: 0,
          pendingRequestsCount: 0,
          deliveriesCount: 0,
          customerOrders: [],
          lastOrderDate: 'No orders yet',
          createdAt: u.createdAt,
        });
      }
    });

    // Aggregate Orders telemetry ONLY for existing approved customers
    orders.forEach((o) => {
      const custName = (o.customer || '').trim();
      const nameKey = custName.toLowerCase();
      if (!nameKey) return;

      const entry = customerMap.get(nameKey);
      if (!entry) return; // Do not add synthetic unapproved customers from raw orders

      entry.ordersCount += 1;
      entry.orders += 1;
      entry.totalQty += o.quantity || o.qty || 0;
      entry.litres += o.quantity || o.qty || 0;
      entry.revenue += o.total || (o.qty || o.quantity || 1000) * 92;

      if (
        ['InTransit', 'In Transit', 'Dispatched', 'Assigned', 'Pending', 'Pending Approval', 'Approved'].includes(
          o.status
        )
      ) {
        entry.activeOrdersCount += 1;
      }
      if (o.status === 'Pending' || o.status === 'Pending Approval') {
        entry.pendingRequestsCount += 1;
      }
      if (o.status === 'Delivered') {
        entry.deliveriesCount += 1;
      }

      entry.customerOrders.push(o);
      if (
        entry.lastOrderDate === 'No orders yet' ||
        new Date(o.createdAt) > new Date(entry.lastOrderDate)
      ) {
        entry.lastOrderDate = `Order #${o.orderNumber}`;
      }
    });

    // Strictly return ONLY approved customers
    let results = Array.from(customerMap.values()).filter(
      (c) =>
        c.registrationStatus === 'Approved' &&
        c.status !== 'Pending' &&
        c.status !== 'Pending Review' &&
        c.status !== 'Rejected' &&
        !blockedEmails.has((c.email || '').toLowerCase().trim()) &&
        !blockedNames.has((c.name || '').toLowerCase().trim())
    );

    // Calculate dynamic credit used if not set
    let result = results.map((c) => {
      if (c.credit.used === 0 && c.revenue > 0) {
        c.credit.used = Math.min(c.credit.limit, Math.round(c.revenue * 0.25));
      }
      return c;
    });

    // Apply query filters
    if (status && status !== 'ALL') {
      result = result.filter(
        (c) => c.status.toLowerCase() === status.toLowerCase() || c.registrationStatus.toLowerCase() === status.toLowerCase()
      );
    }

    if (search) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.gstNumber.toLowerCase().includes(q) ||
          (c.regId && c.regId.toLowerCase().includes(q))
      );
    }

    console.log(`[FDMS Backend] Successfully compiled ${result.length} real customer records from MongoDB.`);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('[FDMS Backend] Error in getCustomers:', error);
    next(error);
  }
};

// @desc    Get single customer details by ID, regId, or name
// @route   GET /api/customers/:id
// @access  Public / Protected
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[FDMS Backend] Fetching customer details for ID: ${id}`);

    let registration = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      registration = await CustomerRegistration.findById(id);
    }
    if (!registration) {
      registration = await CustomerRegistration.findOne({
        $or: [{ regId: id }, { companyName: new RegExp(`^${id}$`, 'i') }],
      });
    }

    // Also check for User with this ID or name
    let user = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(id).select('-password');
    }
    if (!user && registration) {
      user = await User.findOne({ name: registration.companyName }).select('-password');
    }

    const companyName = registration?.companyName || user?.name || id;

    // Fetch all orders for this customer
    const customerOrders = await Order.find({
      $or: [
        { customer: new RegExp(`^${companyName}$`, 'i') },
        ...(user ? [{ customerId: user._id }] : []),
      ],
    }).sort({ createdAt: -1 });

    if (!registration && !user && customerOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer record not found for ID '${id}'`,
      });
    }

    const totalLitres = customerOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);

    const totalRevenue = customerOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const customerData = {
      _id: registration?._id || user?._id,
      id: registration?.regId || registration?._id || user?._id || id,
      regId: registration?.regId || '',
      name: companyName,
      companyName,
      authorizedPerson: registration?.authorizedPerson || registration?.contactPerson || user?.name || 'Authorized Rep',
      contactPerson: registration?.contactPerson || registration?.authorizedPerson || user?.name || 'Authorized Rep',
      email: registration?.email || user?.email || '',
      phone: registration?.phone || registration?.mobile || user?.phone || '',
      mobile: registration?.mobile || registration?.phone || user?.phone || '',
      address: registration?.address || registration?.address1 || user?.site || '',
      city: registration?.city || user?.city || 'Chennai',
      state: registration?.state || 'Tamil Nadu',
      pincode: registration?.pincode || registration?.postalCode || '600001',
      gstNumber: registration?.gstNumber || '—',
      panNumber: registration?.panNumber || '—',
      businessType: registration?.businessType || 'Commercial Logistics',
      industry: registration?.businessType || 'Commercial Logistics',
      monthlyConsumption: registration?.monthlyConsumption || 20000,
      status: registration ? (registration.status === 'Approved' ? 'Active' : registration.status) : 'Active',
      registrationStatus: registration?.status || 'Approved',
      credit: {
        limit: user?.creditLimit || 500000,
        used: user?.creditUsed || Math.min(500000, Math.round(totalRevenue * 0.25)),
        terms: 'NET 30',
      },
      documents: registration?.documents || [],
      gstCertificate: registration?.gstCertificate || {},
      panCard: registration?.panCard || {},
      companyRegistrationCertificate: registration?.companyRegistrationCertificate || {},
      customerOrders,
      ordersCount: customerOrders.length,
      totalLitres,
      totalRevenue,
      deliveriesCount: customerOrders.filter((o) => o.status === 'Delivered').length,
      pendingRequestsCount: customerOrders.filter((o) => o.status === 'Pending' || o.status === 'Pending Approval').length,
      createdAt: registration?.createdAt || user?.createdAt || new Date(),
    };

    res.status(200).json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    console.error('[FDMS Backend] Error in getCustomerById:', error);
    next(error);
  }
};

// @desc    Submit new customer registration
// @route   POST /api/customers
// @access  Public
const createCustomer = async (req, res, next) => {
  try {
    const {
      companyName,
      authorizedPerson,
      contactPerson,
      email,
      phone,
      mobile,
      gstNumber,
      panNumber,
      address,
      address1,
      city,
      state,
      pincode,
      postalCode,
      businessType,
      designation,
      companyRegNo,
      fuelType,
      monthlyConsumption,
    } = req.body;

    const person = authorizedPerson || contactPerson;
    const contactPhone = phone || mobile;
    const addr = address || address1;
    const pin = pincode || postalCode;

    if (!companyName || !person || !email || !contactPhone || !gstNumber || !panNumber || !addr || !city) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required customer registration fields.',
      });
    }

    const regId = req.body.regId || (await generateRegId());

    const uploadedFiles = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();

    let gstCertificate = {};
    let panCard = {};
    let companyRegistrationCertificate = {};
    const documents = [];

    uploadedFiles.forEach((file) => {
      const field = file.fieldname.toLowerCase();
      const fileData = {
        fileName: file.filename,
        originalName: file.originalname,
        filePath: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      };

      if (field.includes('gst')) {
        gstCertificate = fileData;
        documents.push({ type: 'GST Certificate', ...fileData });
      } else if (field.includes('pan')) {
        panCard = fileData;
        documents.push({ type: 'PAN Card', ...fileData });
      } else if (field.includes('reg') || field.includes('company')) {
        companyRegistrationCertificate = fileData;
        documents.push({ type: 'Company Registration', ...fileData });
      } else {
        documents.push({ type: file.fieldname || 'Supporting Document', ...fileData });
      }
    });

    const registration = await CustomerRegistration.create({
      regId,
      companyName,
      authorizedPerson: person,
      contactPerson: person,
      email: email.toLowerCase().trim(),
      phone: contactPhone,
      mobile: contactPhone,
      gstNumber: gstNumber.toUpperCase().trim(),
      panNumber: panNumber.toUpperCase().trim(),
      address: addr,
      address1: addr,
      city,
      state: state || 'Tamil Nadu',
      pincode: pin,
      postalCode: pin,
      businessType: businessType || 'Commercial',
      designation: designation || 'Director',
      companyRegNo: companyRegNo || '',
      fuelType: fuelType || 'DSL',
      monthlyConsumption: Number(monthlyConsumption) || 10000,
      status: 'Pending Review',
      gstCertificate,
      panCard,
      companyRegistrationCertificate,
      documents,
    });

    // Notify Depot Manager and Admins
    try {
      await Notification.create({
        title: 'New Customer Registered',
        message: `Company ${companyName} (${regId}) has submitted a registration request awaiting approval.`,
        category: 'registration',
        role: 'Depot Manager',
        type: 'info',
        read: false,
      });
    } catch (notifErr) {
      console.warn('[FDMS Backend] Non-fatal notification error:', notifErr.message);
    }

    logActivity({
      action: 'Customer Registered',
      userName: person,
      userRole: 'Customer',
      entityId: regId,
      details: `${companyName} registered with ID ${regId}`,
      ipAddress: req.ip || '',
    });

    res.status(201).json({
      success: true,
      message: 'Customer registration submitted successfully and is pending Depot Manager approval.',
      data: registration,
    });
  } catch (error) {
    console.error('[FDMS Backend] Error in createCustomer:', error);
    next(error);
  }
};

// @desc    Update customer approval status (Depot Manager / Admin)
// @route   PATCH /api/customers/:id/status
// @access  Protected (Depot Manager, Admin)
const updateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['Pending Review', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Pending Review', 'Approved', or 'Rejected'",
      });
    }

    let reg = await CustomerRegistration.findById(id);
    if (!reg) {
      reg = await CustomerRegistration.findOne({ regId: id });
    }

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Customer registration record not found',
      });
    }

    reg.status = status;
    if (reviewNotes !== undefined) reg.reviewNotes = reviewNotes;
    await reg.save();

    // If Approved, also ensure a User account exists or is activated
    if (status === 'Approved') {
      const existingUser = await User.findOne({ email: reg.email });
      if (!existingUser) {
        await User.create({
          name: reg.companyName,
          email: reg.email,
          password: 'customer@123',
          role: 'Customer',
          site: reg.address,
          city: reg.city,
          creditLimit: 500000,
          creditUsed: 0,
          phone: reg.phone,
        });
      }

      await Notification.create({
        title: 'Account Approved',
        message: `Corporate account for ${reg.companyName} is Approved. Bulk ordering enabled.`,
        category: 'registration',
        role: 'Customer',
        type: 'success',
        read: false,
      });
    }

    logActivity({
      action: `Customer ${status}`,
      userName: req.user?.name || 'Depot Manager',
      userRole: req.user?.role || 'Depot Manager',
      entityId: reg.regId,
      details: `${reg.companyName} (${reg.regId}) status updated to ${status}`,
      ipAddress: req.ip || '',
    });

    res.status(200).json({
      success: true,
      message: `Customer ${reg.companyName} registration status updated to '${status}'.`,
      data: reg,
    });
  } catch (error) {
    console.error('[FDMS Backend] Error in updateCustomerStatus:', error);
    next(error);
  }
};

// @desc    Delete customer registration
// @route   DELETE /api/customers/:id
// @access  Protected (Admin)
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    let reg = await CustomerRegistration.findById(id);
    if (!reg) reg = await CustomerRegistration.findOne({ regId: id });

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await reg.deleteOne();
    res.status(200).json({ success: true, message: 'Customer record deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomerStatus,
  deleteCustomer,
};
