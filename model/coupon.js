const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  description: {
    type: String,
    default: ""
  },

  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },

  discountValue: {
    type: Number,
    required: true,
    min: 0
  },

  // Percentage discount cap
  maxDiscount: {
    type: Number,
    default: null
  },

  // Minimum purchase required
  minPurchase: {
    type: Number,
    default: 0
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  },

  // Usage limits
  usageLimit: {
    type: Number,
    default: null // null = unlimited
  },

  usageCount: {
    type: Number,
    default: 0
  },

  perUserLimit: {
    type: Number,
    default: 1 // How many times a user can use this coupon
  },

  // Validity period
  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: {
    type: Date,
    default: null
  },

  // Applicable categories/products
  applicableCategories: [{
    type: String
  }],

  applicableProducts: [{
    type: String
  }],

  // Exclude categories/products
  excludedCategories: [{
    type: String
  }],

  excludedProducts: [{
    type: String
  }],

  // Metadata
  createdBy: {
    type: String,
    default: "admin"
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  usedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    usageDate: Date,
    orderReference: String
  }]
});

// Index for performance (code is auto-indexed via unique: true)
CouponSchema.index({ isActive: 1, endDate: 1 });

module.exports = mongoose.model("Coupon", CouponSchema);
