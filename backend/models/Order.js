const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      trim: true,
      default: () => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const rand = Math.floor(100 + Math.random() * 900);
        return `ORD-${yy}${mm}${dd}-${rand}`;
      },
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customer: {
      type: String,
      trim: true,
      default: 'Customer',
    },
    fuelType: {
      type: String,
      required: [true, 'Fuel type is required'],
      trim: true,
      uppercase: true,
    },
    // Alias for backward compatibility
    fuelCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: function () {
        return this.fuelType;
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity in litres is required'],
      min: [1, 'Quantity must be at least 1 litre'],
    },
    // Alias for backward compatibility
    qty: {
      type: Number,
      default: function () {
        return this.quantity;
      },
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
    },
    // Alias for backward compatibility
    site: {
      type: String,
      trim: true,
      default: function () {
        return this.deliveryAddress;
      },
    },
    status: {
      type: String,
      enum: {
        values: [
          'Pending',
          'Approved',
          'Rejected',
          'Assigned',
          'In Transit',
          'InTransit',
          'Dispatched',
          'Delivered',
          'Cancelled',
        ],
        message: '{VALUE} is not a valid order status',
      },
      default: 'Pending',
    },
    driver: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    vehicle: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    city: {
      type: String,
      default: 'Chennai',
      trim: true,
    },
    slot: {
      type: String,
      default: '08:00-10:00',
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 250,
    },
    total: {
      type: Number,
      default: 0,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    assignedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to sync aliases: fuelType/fuelCode, quantity/qty, deliveryAddress/site
orderSchema.pre('validate', function () {
  if (!this.fuelType && this.fuelCode) {
    this.fuelType = this.fuelCode;
  }
  if (!this.fuelCode && this.fuelType) {
    this.fuelCode = this.fuelType;
  }

  if (this.quantity == null && this.qty != null) {
    this.quantity = this.qty;
  }
  if (this.qty == null && this.quantity != null) {
    this.qty = this.quantity;
  }

  if (!this.deliveryAddress && this.site) {
    this.deliveryAddress = this.site;
  }
  if (!this.site && this.deliveryAddress) {
    this.site = this.deliveryAddress;
  }
});

module.exports = mongoose.model('Order', orderSchema);
