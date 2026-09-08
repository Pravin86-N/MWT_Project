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

const registrationSchema = new mongoose.Schema(
  {
    regId: {
      type: String,
      unique: true,
      trim: true,
      default: () => {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        return `REG-${year}-${randomSuffix}`;
      },
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    // Company Information
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
    contactPerson: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    phone: {
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
      default: '600001',
    },
    postalCode: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      default: 'Commercial',
    },
    designation: {
      type: String,
      default: 'Director',
    },
    companyRegNo: {
      type: String,
      default: '',
      trim: true,
    },
    fuelType: {
      type: String,
      default: 'DSL',
    },
    monthlyConsumption: {
      type: Number,
      default: 0,
    },
    // Uploaded Documents
    panDocument: {
      type: documentFileSchema,
      default: () => ({}),
    },
    panCard: {
      type: documentFileSchema,
      default: () => ({}),
    },
    gstCertificate: {
      type: documentFileSchema,
      default: () => ({}),
    },
    companyRegistrationCertificate: {
      type: documentFileSchema,
      default: () => ({}),
    },
    addressProof: {
      type: documentFileSchema,
      default: () => ({}),
    },
    additionalSupportingDocuments: [documentFileSchema],
    documents: [
      {
        type: {
          type: String,
          default: 'Document',
        },
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
    ],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Pending Review'],
      default: 'Pending',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'customerregistrations', // keep unified in existing collection
  }
);

// Pre-validate hook to sync alias fields and generate regId if missing
registrationSchema.pre('validate', function () {
  if (!this.authorizedPerson && this.contactPerson) {
    this.authorizedPerson = this.contactPerson;
  }
  if (!this.contactPerson && this.authorizedPerson) {
    this.contactPerson = this.authorizedPerson;
  }

  if (!this.mobile && this.phone) {
    this.mobile = this.phone;
  }
  if (!this.phone && this.mobile) {
    this.phone = this.mobile;
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
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.regId = `REG-${year}-${randomSuffix}`;
  }

  if (!this.submittedAt) {
    this.submittedAt = new Date();
  }
});

module.exports = mongoose.model('Registration', registrationSchema);
