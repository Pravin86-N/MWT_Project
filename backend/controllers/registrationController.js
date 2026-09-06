const CustomerRegistration = require('../models/CustomerRegistration');
const User = require('../models/User');

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

// @desc    Get all customer registrations
// @route   GET /api/registrations
// @access  Public / Protected
const getRegistrations = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { regId: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { authorizedPerson: new RegExp(search, 'i') },
        { contactPerson: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { gstNumber: new RegExp(search, 'i') },
        { panNumber: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }

    const registrations = await CustomerRegistration.find(filter).sort({
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
      reg = await CustomerRegistration.findById(id);
    } else {
      reg = await CustomerRegistration.findOne({ regId: id });
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

    // Validate required fields
    if (
      !companyName ||
      !person ||
      !email ||
      !contactPhone ||
      !gstNumber ||
      !panNumber ||
      !addr ||
      !city ||
      !state ||
      !pin
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide all required fields: companyName, authorizedPerson, email, phone, gstNumber, panNumber, address, city, state, pincode',
      });
    }

    const regId = req.body.regId || (await generateRegId());

    // Normalize uploaded files from multer (handles both upload.any() array and upload.fields() object)
    const uploadedFiles = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();

    let gstCertificate = {};
    let panCard = {};
    let companyRegistrationCertificate = {};
    const documents = [];

    // Process uploaded files
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

      if (field.includes('gst') || field === 'gstcertificate') {
        gstCertificate = fileData;
        documents.push({ type: 'GST Certificate', ...fileData });
      } else if (field.includes('pan') || field === 'pancard') {
        panCard = fileData;
        documents.push({ type: 'PAN Card', ...fileData });
      } else if (
        field.includes('company') ||
        field.includes('cert') ||
        field === 'companyregistrationcertificate'
      ) {
        companyRegistrationCertificate = fileData;
        documents.push({
          type: 'Company Registration Certificate',
          ...fileData,
        });
      } else {
        documents.push({
          type: req.body[`type_${file.fieldname}`] || file.fieldname,
          ...fileData,
        });
      }
    });

    // Also support JSON documents payload if passed (e.g. from seeds or raw JSON clients)
    if (req.body.documents) {
      try {
        const parsed =
          typeof req.body.documents === 'string'
            ? JSON.parse(req.body.documents)
            : req.body.documents;
        if (Array.isArray(parsed)) {
          parsed.forEach((doc) => {
            const docObj = {
              type: doc.type || 'Attachment',
              fileName: doc.fileName || doc.filename || 'document.pdf',
              originalName: doc.originalName || doc.fileName || '',
              filePath: doc.filePath || `/uploads/${doc.fileName || ''}`,
              mimetype: doc.mimetype || 'application/pdf',
              size: doc.size || 0,
              uploadedAt: doc.uploadedAt || new Date(),
            };

            documents.push(docObj);

            if (docObj.type === 'GST Certificate' && !gstCertificate.fileName) {
              gstCertificate = docObj;
            } else if (docObj.type === 'PAN Card' && !panCard.fileName) {
              panCard = docObj;
            } else if (
              (docObj.type === 'Company Registration Certificate' ||
                docObj.type === 'Incorporation Cert') &&
              !companyRegistrationCertificate.fileName
            ) {
              companyRegistrationCertificate = docObj;
            }
          });
        }
      } catch (err) {
        // Ignore JSON parse error for body.documents
      }
    }

    const registration = await CustomerRegistration.create({
      regId,
      companyName: companyName.trim(),
      authorizedPerson: person.trim(),
      contactPerson: person.trim(),
      email: email.toLowerCase().trim(),
      phone: contactPhone.trim(),
      mobile: contactPhone.trim(),
      gstNumber: gstNumber.toUpperCase().trim(),
      panNumber: panNumber.toUpperCase().trim(),
      address: addr.trim(),
      address1: addr.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pin.trim(),
      postalCode: pin.trim(),
      gstCertificate,
      panCard,
      companyRegistrationCertificate,
      documents,
      businessType: businessType || 'Commercial',
      designation: designation || '',
      companyRegNo: companyRegNo || '',
      fuelType: fuelType || 'DSL',
      monthlyConsumption: monthlyConsumption ? Number(monthlyConsumption) : 0,
      status: 'Pending Review',
    });

    res.status(201).json({
      success: true,
      message: 'Customer registration application submitted successfully',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update registration status (Approve / Reject)
// @route   PATCH /api/registrations/:id/status
// @access  Private (Admin, Depot Manager)
const updateRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, initialCreditLimit = 300000 } = req.body;

    if (!['Pending Review', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Pending Review', 'Approved', or 'Rejected'",
      });
    }

    let reg;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      reg = await CustomerRegistration.findById(id);
    } else {
      reg = await CustomerRegistration.findOne({ regId: id });
    }

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found',
      });
    }

    reg.status = status;
    if (reviewNotes !== undefined) reg.reviewNotes = reviewNotes;
    await reg.save();

    // If approved, create user account if it doesn't already exist
    if (status === 'Approved') {
      const existingUser = await User.findOne({ email: reg.email });
      if (!existingUser) {
        const defaultPassword = 'customer123';
        await User.create({
          name: reg.companyName,
          email: reg.email,
          password: defaultPassword,
          role: 'Customer',
          site: reg.address || `${reg.companyName} Site`,
          city: reg.city,
          creditLimit: initialCreditLimit,
          creditUsed: 0,
          phone: reg.phone,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Registration ${status.toLowerCase()} successfully`,
      data: reg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private (Admin)
const deleteRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reg = await CustomerRegistration.findByIdAndDelete(id);

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
  updateRegistrationStatus,
  deleteRegistration,
};
