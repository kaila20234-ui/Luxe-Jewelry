// scripts/setup-indexes.js - Create essential database indexes
const mongoose = require('mongoose');
require('dotenv').config();

async function setupIndexes() {
  try {
    console.log('[INDEXES] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry');

    console.log('[INDEXES] Setting up indexes...');

    // User indexes
    const User = require('../model/user');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ User email index created');

    await User.collection.createIndex({ role: 1 });
    console.log('✅ User role index created');

    await User.collection.createIndex({ createdAt: -1 });
    console.log('✅ User createdAt index created');

    // Sales indexes
    const Sales = mongoose.model('Sale');
    await Sales.collection.createIndex({ userId: 1 });
    console.log('✅ Sales userId index created');

    await Sales.collection.createIndex({ date: -1 });
    console.log('✅ Sales date index created');

    await Sales.collection.createIndex({ status: 1 });
    console.log('✅ Sales status index created');

    await Sales.collection.createIndex({ reference: 1 }, { unique: true });
    console.log('✅ Sales reference index created');

    // Complaints indexes
    const Complaint = mongoose.model('Complaint');
    await Complaint.collection.createIndex({ status: 1 });
    console.log('✅ Complaint status index created');

    await Complaint.collection.createIndex({ userId: 1 });
    console.log('✅ Complaint userId index created');

    // TokenBlacklist indexes
    const TokenBlacklist = require('../model/tokenBlacklist');
    await TokenBlacklist.collection.createIndex({ jti: 1 }, { unique: true });
    console.log('✅ TokenBlacklist jti index created');

    await TokenBlacklist.collection.createIndex({ userId: 1 });
    console.log('✅ TokenBlacklist userId index created');

    await TokenBlacklist.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✅ TokenBlacklist TTL index created');

    // AuditLog indexes
    const AuditLog = require('../model/auditLog');
    await AuditLog.collection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✅ AuditLog (userId, createdAt) index created');

    await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
    console.log('✅ AuditLog (action, createdAt) index created');

    await AuditLog.collection.createIndex({ createdAt: -1 });
    console.log('✅ AuditLog createdAt index created');

    console.log('\n✅ All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[INDEXES] Error setting up indexes:', error.message);
    process.exit(1);
  }
}

setupIndexes();
