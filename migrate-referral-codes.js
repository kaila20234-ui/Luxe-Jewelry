// migrate-referral-codes.js - Assign referral codes to existing users without them
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('./model/user');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

async function generateReferralCode() {
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const existing = await User.findOne({ referralCode: code });
  if (existing) {
    return generateReferralCode();
  }
  return code;
}

async function migrateReferralCodes() {
  try {
    console.log('[MIGRATE] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[MIGRATE] Connected');

    console.log('[MIGRATE] Finding users without referral codes...');
    const usersWithoutCode = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' }
      ]
    });

    console.log(`[MIGRATE] Found ${usersWithoutCode.length} users without referral codes`);

    if (usersWithoutCode.length === 0) {
      console.log('[MIGRATE] All users already have referral codes');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;
    for (const user of usersWithoutCode) {
      try {
        const code = await generateReferralCode();
        user.referralCode = code;
        await user.save();
        updated++;
        console.log(`[MIGRATE] Assigned code "${code}" to user ${user.email}`);
      } catch (err) {
        console.error(`[MIGRATE] Error updating user ${user.email}:`, err.message);
      }
    }

    console.log(`[MIGRATE] Successfully updated ${updated} users`);
    console.log('[MIGRATE] Migration complete');
    await mongoose.connection.close();
  } catch (err) {
    console.error('[MIGRATE] Fatal error:', err);
    process.exit(1);
  }
}

migrateReferralCodes();
