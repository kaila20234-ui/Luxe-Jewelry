#!/usr/bin/env node
/**
 * Check if user has cart field
 * Verifies database state
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

async function checkDatabase() {
  try {
    console.log('[DB-CHECK] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[DB-CHECK] ✓ Connected\n');

    // Define schema
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema, 'users');

    // Find test user
    const testEmail = 'haptasatarast@gmail.com';
    console.log('[DB-CHECK] Looking for user:', testEmail);
    
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('[DB-CHECK] ✗ User not found!');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('[DB-CHECK] ✓ User found');
    console.log('[DB-CHECK] User ID:', user._id);
    console.log('[DB-CHECK] Name:', user.name);
    console.log('[DB-CHECK] Email:', user.email);
    console.log('[DB-CHECK] Has cart field:', !!user.cart);
    console.log('[DB-CHECK] Cart type:', typeof user.cart);
    console.log('[DB-CHECK] Cart value:', JSON.stringify(user.cart, null, 2));
    console.log('[DB-CHECK] Cart length:', user.cart ? user.cart.length : 'undefined');

    // Check raw document
    console.log('\n[DB-CHECK] Full document keys:', Object.keys(user.toObject ? user.toObject() : user));

    await mongoose.disconnect();
    console.log('\n[DB-CHECK] ✓ Done');

  } catch (error) {
    console.error('[DB-CHECK] Error:', error.message);
    process.exit(1);
  }
}

await checkDatabase();
