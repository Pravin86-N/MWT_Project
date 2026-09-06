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
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
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
        values: ['Admin', 'Depot Manager', 'Customer', 'Driver'],
        message: '{VALUE} is not a valid role. Allowed roles: Admin, Depot Manager, Customer',
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
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next ? next() : undefined;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (next) next();
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
