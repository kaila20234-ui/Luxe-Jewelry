const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't return password by default when querying
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  addresses: [
    {
      label: { type: String, default: 'Home' }, // 'Home', 'Work', 'Other'
      street: String,
      city: String,
      state: String,
      zip: String,
      zipcode: String, // Keep for backward compatibility
      country: String,
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  // Shopping cart: stores items user is currently shopping with
  cart: [
    {
      id: String,  // Product ID
      name: String,
      price: { type: Number, default: 0 },
      image: String,
      category: String,
      qty: { type: Number, default: 1, min: 1 },
      addedAt: { type: Date, default: Date.now }
    }
  ],
  preferences: {
    newsletter: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  passwordResetToken: String,
  passwordResetTokenExpiry: Date,
  // Account security: failed login tracking
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  // 2FA: TOTP support
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  // Token version for invalidation
  tokenVersion: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // role: customer | manager | admin
  role: {
    type: String,
    enum: ['customer','manager','admin'],
    default: 'customer'
  },
  // Account suspension
  suspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspendedAt: Date,
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  storeCredit: {
    type: Number,
    default: 0
  },
  rewardHistory: [
    {
      type: {
        type: String,
        enum: ['milestone', 'referral_purchase', 'purchase'],
        default: 'purchase'
      },
      amount: { type: Number, default: 0 },
      reason: String,
      sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      relatedSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
      awardedAt: { type: Date, default: Date.now }
    }
  ],
  referralMilestoneRewardedCount: {
    type: Number,
    default: 0
  },
  referredPurchaseRewards: {
    type: Number,
    default: 0
  },
  ownPurchaseRewards: {
    type: Number,
    default: 0
  }
});

// Removed explicit index for email to avoid duplicate index warning

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

// Method to reset failed login attempts
userSchema.methods.resetFailedLoginAttempts = async function () {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  await this.save();
};

// Method to increment failed login attempts
userSchema.methods.incrementFailedLoginAttempts = async function () {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  await this.save();
};

// Method to get user data without sensitive fields
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.verificationTokenExpiry;
  delete obj.passwordResetToken;
  delete obj.passwordResetTokenExpiry;
  delete obj.twoFactorSecret;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
