const bcrypt = require('bcryptjs');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper to generate registration ID: REG-YYYY-XXX
const generateRegId = async () => {
  const year = new Date().getFullYear();
  const prefix = `REG-${year}`;
  const count = await Registration.countDocuments({
    regId: new RegExp(`^${prefix}`),
  });
  const seq = String(900 + count + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
};

// @desc    Get all customer registrations
// @route   GET /api/registrations
// @access  Public / Protected (Admin, Depot Manager)
const getRegistrations = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      if (status === 'Pending' || status === 'Pending Review') {
        filter.status = { $in: ['Pending', 'Pending Review'] };
      } else {
        filter.status = status;
      }
    }

    if (search) {
      filter.$or = [
        { regId: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { authorizedPerson: new RegExp(search, 'i') },
        { contactPerson: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { gstNumber: new RegExp(search, 'i') },
        { panNumber: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }

    const registrations = await Registration.find(filter).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get registration by ID or regId
// @route   GET /api/registrations/:id
// @access  Public / Protected
const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let reg;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      reg = await Registration.findById(id);
    } else {
      reg = await Registration.findOne({ regId: id });
    }

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found',
      });
    }

    res.status(200).json({ success: true, data: reg });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit new customer registration with document uploads
// @route   POST /api/registrations
// @access  Public
const createRegistration = async (req, res, next) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      companyName,
      authorizedPerson,
      authorizedPersonName,
      contactPerson,
      mobile,
      mobileNumber,
      phone,
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

    const person = authorizedPerson || authorizedPersonName || contactPerson;
    const contactPhone = mobile || mobileNumber || phone;
    const addr = address || address1;
    const pin = pincode || postalCode || '600001';

    // Validate Account Information
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match.',
      });
    }

    // Validate Company Information
    if (!companyName || !person || !contactPhone || !gstNumber || !panNumber || !addr) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required company details: Company Name, Authorized Person Name, Mobile Number, GST Number, PAN Number, and Address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An approved account with this email address already exists. Please log in.',
      });
    }

    // Check if registration already exists in Registration collection with Pending status
    const existingReg = await Registration.findOne({
      email: normalizedEmail,
      status: { $in: ['Pending', 'Pending Review'] },
    });
    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'Your registration request has already been submitted and is awaiting approval.',
      });
    }

    const regId = req.body.regId || (await generateRegId());

    // Normalize uploaded files from multer
    const uploadedFiles = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();

    let panDoc = {};
    let gstDoc = {};
    let companyRegDoc = {};
    let addrDoc = {};
    const additionalDocs = [];
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

      if (field.includes('pan') || field === 'pandocument' || field === 'pancard') {
        panDoc = fileData;
        documents.push({ type: 'PAN Document', ...fileData });
      } else if (field.includes('gst') || field === 'gstcertificate') {
        gstDoc = fileData;
        documents.push({ type: 'GST Certificate', ...fileData });
      } else if (
        field.includes('company') ||
        field.includes('registration') ||
        field === 'companyregistrationcertificate'
      ) {
        companyRegDoc = fileData;
        documents.push({ type: 'Company Registration Certificate', ...fileData });
      } else if (field.includes('address') || field === 'addressproof') {
        addrDoc = fileData;
        documents.push({ type: 'Address Proof', ...fileData });
      } else {
        additionalDocs.push(fileData);
        documents.push({
          type: req.body[`type_${file.fieldname}`] || 'Additional Supporting Document',
          ...fileData,
        });
      }
    });

    // Hash the password before saving into Registration collection
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save application into Registration collection with Status = 'Pending'
    // NOTE: Customer account is NOT created in Users collection yet!
    const registration = await Registration.create({
      regId,
      email: normalizedEmail,
      password: hashedPassword,
      companyName: companyName.trim(),
      authorizedPerson: person.trim(),
      contactPerson: person.trim(),
      mobile: contactPhone.trim(),
      phone: contactPhone.trim(),
      gstNumber: gstNumber.toUpperCase().trim(),
      panNumber: panNumber.toUpperCase().trim(),
      address: addr.trim(),
      address1: addr.trim(),
      city: (city || 'Chennai').trim(),
      state: (state || 'Tamil Nadu').trim(),
      pincode: pin.trim(),
      postalCode: pin.trim(),
      businessType: businessType || 'Commercial',
      designation: designation || 'Director',
      companyRegNo: companyRegNo || '',
      fuelType: fuelType || 'DSL',
      monthlyConsumption: monthlyConsumption ? Number(monthlyConsumption) : 0,
      panDocument: panDoc,
      panCard: panDoc,
      gstCertificate: gstDoc,
      companyRegistrationCertificate: companyRegDoc,
      addressProof: addrDoc,
      additionalSupportingDocuments: additionalDocs,
      documents,
      status: 'Pending',
      submittedAt: new Date(),
    });

    // Notify Admins & Depot Managers
    try {
      await Notification.create({
        title: 'New Customer Registration',
        message: `New registration application #${registration.regId} submitted by ${registration.companyName} awaiting approval.`,
        category: 'registration',
        role: 'Admin',
        type: 'info',
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your registration request has been submitted successfully and is awaiting approval.',
      data: {
        _id: registration._id,
        regId: registration.regId,
        companyName: registration.companyName,
        email: registration.email,
        status: registration.status,
        submittedAt: registration.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve customer registration (Admin & Depot Manager)
// @route   PUT /api/registrations/:id/approve
// @access  Private (Admin, Depot Manager)
const approveRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;

    let reg;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      reg = await Registration.findById(id);
    } else {
      reg = await Registration.findOne({ regId: id });
    }

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found',
      });
    }

    // 1. Create actual customer account in Users collection if not existing
    const existingUser = await User.findOne({ email: reg.email });
    if (!existingUser) {
      // 2. Copy registration data
      // 3. Set role = Customer
      // 4. Store hashed password (already hashed in Registration)
      await User.create({
        name: reg.companyName,
        email: reg.email,
        password: reg.password, // Pre-hashed password copied directly
        role: 'Customer',
        site: reg.address || `${reg.companyName} Site`,
        city: reg.city || 'Chennai',
        creditLimit: 500000,
        creditUsed: 0,
        phone: reg.mobile || reg.phone || '',
      });
    } else {
      // Ensure user role is Customer and sync password
      existingUser.role = 'Customer';
      existingUser.password = reg.password;
      await existingUser.save();
    }

    // 5. Update registration status = Approved
    // 6. Save approvedBy
    // 7. Save approvedAt
    reg.status = 'Approved';
    reg.approvedBy = req.user?.name || req.body?.approvedBy || 'Admin';
    reg.approvedAt = new Date();
    reg.reviewNotes = req.body?.reviewNotes || 'Registration approved and customer activated.';
    await reg.save();

    try {
      await Notification.create({
        title: 'Account Approved',
        message: `Corporate account for ${reg.companyName} has been approved. You can now log in and place orders.`,
        category: 'registration',
        role: 'Customer',
        type: 'success',
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]:', notifErr.message);
    }

    // 8. Show success message
    res.status(200).json({
      success: true,
      message: `Registration for ${reg.companyName} approved successfully. Customer account activated.`,
      data: reg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject customer registration (Admin & Depot Manager)
// @route   PUT /api/registrations/:id/reject
// @access  Private (Admin, Depot Manager)
const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason, reason } = req.body;

    const reasonText = rejectionReason || reason || 'Application rejected by reviewer.';

    let reg;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      reg = await Registration.findById(id);
    } else {
      reg = await Registration.findOne({ regId: id });
    }

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found',
      });
    }

    // 1. Status = Rejected
    // 2. Save rejection reason
    // 3. Save rejected date
    reg.status = 'Rejected';
    reg.rejectionReason = reasonText;
    reg.rejectedAt = new Date();
    reg.reviewNotes = reasonText;
    await reg.save();

    // If an associated customer user was created, remove it to enforce login restrictions
    await User.findOneAndDelete({ email: reg.email, role: 'Customer' });

    try {
      await Notification.create({
        title: 'Registration Rejected',
        message: `Registration application for ${reg.companyName} was rejected: ${reasonText}`,
        category: 'registration',
        role: 'Admin',
        type: 'warning',
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Registration for ${reg.companyName} has been rejected.`,
      data: reg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update registration status (Backward compatible status patch)
// @route   PATCH /api/registrations/:id/status
// @access  Private (Admin, Depot Manager)
const updateRegistrationStatus = async (req, res, next) => {
  const { status } = req.body;
  if (status === 'Approved') {
    return approveRegistration(req, res, next);
  } else if (status === 'Rejected') {
    return rejectRegistration(req, res, next);
  } else {
    return res.status(400).json({
      success: false,
      message: "Status must be 'Approved' or 'Rejected'",
    });
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private (Admin)
const deleteRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reg = await Registration.findByIdAndDelete(id);

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  approveRegistration,
  rejectRegistration,
  updateRegistrationStatus,
  deleteRegistration,
};
