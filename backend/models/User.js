const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Depot Manager', 'Customer', 'Driver', 'Support Executive', 'Auditor'],
        message: '{VALUE} is not a valid role. Allowed roles: Admin, Depot Manager, Customer, Driver, Support Executive, Auditor',
      },
      default: 'Customer',
    },
    site: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    creditUsed: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Active'],
      default: 'Active',
    },
    loginProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    resetOTP: {
      type: String,
      default: null,
    },
    resetOTPExpiry: {
      type: Date,
      default: null,
    },
    loginOTP: {
      type: String,
      default: null,
    },
    loginOTPExpiry: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcryptjs before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  // If already hashed with bcrypt, do not re-hash
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
