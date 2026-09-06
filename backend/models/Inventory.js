const mongoose = require('mongoose');

const refillRecordSchema = new mongoose.Schema(
  {
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Refill quantity must be greater than 0'],
    },
    requestedBy: {
      type: String,
      default: 'Depot Manager',
      trim: true,
    },
    supplier: {
      type: String,
      default: 'Indian Oil Corporation',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Requested', 'In Transit', 'Completed'],
      default: 'Completed',
    },
    notes: {
      type: String,
      default: '',
    },
    refillDate: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const inventorySchema = new mongoose.Schema(
  {
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
    capacity: {
      type: Number,
      required: [true, 'Capacity in litres is required'],
      min: [0, 'Capacity cannot be negative'],
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock in litres is required'],
      min: [0, 'Current stock cannot be negative'],
    },
    // Alias for backward compatibility
    current: {
      type: Number,
      default: function () {
        return this.currentStock;
      },
    },
    minimumThreshold: {
      type: Number,
      required: [true, 'Minimum threshold in litres is required'],
      min: [0, 'Minimum threshold cannot be negative'],
      default: 5000,
    },
    // Alias for backward compatibility
    threshold: {
      type: Number,
      default: function () {
        return this.minimumThreshold;
      },
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    tankId: {
      type: String,
      unique: true,
      trim: true,
      default: function () {
        const code = this.fuelType || this.fuelCode || 'DSL';
        const rand = Math.floor(10 + Math.random() * 90);
        return `TK-${code}-${rand}`;
      },
    },
    name: {
      type: String,
      trim: true,
    },
    temp: {
      type: Number,
      default: 25.0,
    },
    pressure: {
      type: Number,
      default: 1.0,
    },
    lastRefill: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    refillHistory: [refillRecordSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Check if current stock is below or equal to minimum threshold
inventorySchema.virtual('isLowStock').get(function () {
  const stock = this.currentStock != null ? this.currentStock : this.current;
  const thresh = this.minimumThreshold != null ? this.minimumThreshold : this.threshold;
  return stock <= thresh;
});

// Virtual: Available stock unreserved for orders
inventorySchema.virtual('availableStock').get(function () {
  const stock = this.currentStock != null ? this.currentStock : this.current;
  return Math.max(0, stock - (this.reserved || 0));
});

// Virtual: Capacity fill percentage
inventorySchema.virtual('fillPercentage').get(function () {
  const stock = this.currentStock != null ? this.currentStock : this.current;
  return this.capacity > 0 ? Math.round((stock / this.capacity) * 100) : 0;
});

// Pre-validate hook to synchronize alias fields and generate identifiers
inventorySchema.pre('validate', function () {
  // Sync fuelType <-> fuelCode
  if (!this.fuelType && this.fuelCode) {
    this.fuelType = this.fuelCode;
  }
  if (!this.fuelCode && this.fuelType) {
    this.fuelCode = this.fuelType;
  }

  // Sync currentStock <-> current
  if (this.currentStock == null && this.current != null) {
    this.currentStock = this.current;
  }
  if (this.current == null && this.currentStock != null) {
    this.current = this.currentStock;
  }

  // Sync minimumThreshold <-> threshold
  if (this.minimumThreshold == null && this.threshold != null) {
    this.minimumThreshold = this.threshold;
  }
  if (this.threshold == null && this.minimumThreshold != null) {
    this.threshold = this.minimumThreshold;
  }

  if (!this.tankId) {
    const code = this.fuelType || 'DSL';
    const rand = Math.floor(10 + Math.random() * 90);
    this.tankId = `TK-${code}-${rand}`;
  }

  if (!this.name) {
    this.name = `Depot Storage Tank - ${this.fuelType || 'Fuel'}`;
  }
});

// Use 'tanks' collection for seamless compatibility with existing database seeds and controllers
const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema, 'tanks');

module.exports = Inventory;
