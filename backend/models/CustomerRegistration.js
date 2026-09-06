const mongoose = require('mongoose');

const documentFileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      default: '',
    },
    originalName: {
      type: String,
      default: '',
    },
    filePath: {
      type: String,
      default: '',
    },
    mimetype: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const customerRegistrationSchema = new mongoose.Schema(
  {
    regId: {
      type: String,
      unique: true,
      trim: true,
      default: () => {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        return `REG-${year}-${randomSuffix}`;
      },
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    authorizedPerson: {
      type: String,
      required: [true, 'Authorized person name is required'],
      trim: true,
    },
    // Alias for backward compatibility
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    // Alias for backward compatibility
    mobile: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      required: [true, 'GST number is required'],
      trim: true,
      uppercase: true,
    },
    panNumber: {
      type: String,
      required: [true, 'PAN number is required'],
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    // Alias for backward compatibility
    address1: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      default: 'Chennai',
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      default: 'Tamil Nadu',
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
    // Alias for backward compatibility
    postalCode: {
      type: String,
      trim: true,
    },
    // Document Uploads
    gstCertificate: {
      type: documentFileSchema,
      default: () => ({}),
    },
    panCard: {
      type: documentFileSchema,
      default: () => ({}),
    },
    companyRegistrationCertificate: {
      type: documentFileSchema,
      default: () => ({}),
    },
    // Unified documents array
    documents: [
      {
        type: {
          type: String,
          required: true,
        },
        fileName: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          default: '',
        },
        filePath: {
          type: String,
          default: '',
        },
        mimetype: {
          type: String,
          default: '',
        },
        size: {
          type: Number,
          default: 0,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    businessType: {
      type: String,
      default: 'Commercial',
    },
    designation: {
      type: String,
      default: '',
    },
    companyRegNo: {
      type: String,
      default: '',
      trim: true,
    },
    fuelType: {
      type: String,
      enum: ['DSL', 'PTL', 'LPG', 'KRS'],
      default: 'DSL',
    },
    monthlyConsumption: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Approved', 'Rejected'],
      default: 'Pending Review',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to sync alias fields and generate regId if missing
customerRegistrationSchema.pre('validate', function () {
  if (!this.authorizedPerson && this.contactPerson) {
    this.authorizedPerson = this.contactPerson;
  }
  if (!this.contactPerson && this.authorizedPerson) {
    this.contactPerson = this.authorizedPerson;
  }

  if (!this.phone && this.mobile) {
    this.phone = this.mobile;
  }
  if (!this.mobile && this.phone) {
    this.mobile = this.phone;
  }

  if (!this.address && this.address1) {
    this.address = this.address1;
  }
  if (!this.address1 && this.address) {
    this.address1 = this.address;
  }

  if (!this.pincode && this.postalCode) {
    this.pincode = this.postalCode;
  }
  if (!this.postalCode && this.pincode) {
    this.postalCode = this.pincode;
  }

  if (!this.regId) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.regId = `REG-${year}-${randomSuffix}`;
  }
});

module.exports = mongoose.model('CustomerRegistration', customerRegistrationSchema);
