#!/usr/bin/env node
/**
 * Database Migration: Add cart field to User collection
 * This script adds the cart array field to all existing users
 * 
 * Usage: node migrate-add-cart.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
  avatar: String,
  addresses: [
    {
      label: { type: String, default: 'Home' },
      street: String,
      city: String,
      state: String,
      zip: String,
      zipcode: String,
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
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
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
  role: {
    type: String,
    enum: ['customer', 'manager', 'admin'],
    default: 'customer'
  }
});

const User = mongoose.model('User', userSchema, 'users');

async function migrateDatabase() {
  try {
    console.log('[MIGRATE] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[MIGRATE] ✓ Connected to MongoDB');

    console.log('[MIGRATE] Starting migration: Adding cart field to users...');

    // Update all users to add cart array if it doesn't exist
    const result = await User.updateMany(
      { cart: { $exists: false } },
      { $set: { cart: [] } }
    );

    console.log(`[MIGRATE] ✓ Updated ${result.modifiedCount} users`);
    console.log(`[MIGRATE] ✓ Matched ${result.matchedCount} users total`);

    // Verify migration
    const userCount = await User.countDocuments();
    const usersWithCart = await User.countDocuments({ cart: { $exists: true } });
    
    console.log(`[MIGRATE] Total users: ${userCount}`);
    console.log(`[MIGRATE] Users with cart field: ${usersWithCart}`);

    if (userCount === usersWithCart) {
      console.log('[MIGRATE] ✓ Migration completed successfully!');
      console.log('[MIGRATE] All users now have cart field');
    } else {
      console.warn('[MIGRATE] ⚠ Some users may not have cart field');
    }

    await mongoose.disconnect();
    console.log('[MIGRATE] ✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('[MIGRATE] ✗ Migration failed:', error.message);
    process.exit(1);
  }
}

await migrateDatabase();
