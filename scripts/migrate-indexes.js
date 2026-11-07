/**
 * Database Migration Script
 * Run this once to create necessary indexes for performance optimization
 * 
 * Usage: node scripts/migrate-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('../model/user');
    const Product = require('../model/product');
    const Message = require('../model/message');
    const Wishlist = require('../model/wishlist');
    const Review = require('../model/review');
    const Newsletter = require('../model/newsletter');
    const OtpSession = require('../model/otpSession');

    console.log('\n📊 Creating indexes...\n');

    // User indexes
    console.log('Creating User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 });
    await User.collection.createIndex({ role: 1 });
    console.log('✅ User indexes created');

    // Product indexes
    console.log('Creating Product indexes...');
    await Product.collection.createIndex({ name: 'text', description: 'text', tags: 'text' });
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ available: 1 });
    await Product.collection.createIndex({ price: 1 });
    await Product.collection.createIndex({ createdAt: -1 });
    console.log('✅ Product indexes created');

    // Message indexes
    console.log('Creating Message indexes...');
    await Message.collection.createIndex({ senderId: 1 });
    await Message.collection.createIndex({ recipientId: 1 });
    await Message.collection.createIndex({ conversationId: 1 });
    await Message.collection.createIndex({ createdAt: -1 });
    await Message.collection.createIndex({ isRead: 1 });
    console.log('✅ Message indexes created');

    // Wishlist indexes
    console.log('Creating Wishlist indexes...');
    await Wishlist.collection.createIndex({ userId: 1, productId: 1 }, { unique: true });
    await Wishlist.collection.createIndex({ addedAt: -1 });
    console.log('✅ Wishlist indexes created');

    // Review indexes
    console.log('Creating Review indexes...');
    await Review.collection.createIndex({ productId: 1 });
    await Review.collection.createIndex({ userId: 1 });
    await Review.collection.createIndex({ productId: 1, userId: 1 }, { unique: true });
    await Review.collection.createIndex({ rating: 1 });
    await Review.collection.createIndex({ createdAt: -1 });
    console.log('✅ Review indexes created');

    // Newsletter indexes
    console.log('Creating Newsletter indexes...');
    await Newsletter.collection.createIndex({ email: 1 }, { unique: true });
    await Newsletter.collection.createIndex({ isActive: 1 });
    await Newsletter.collection.createIndex({ subscribedAt: -1 });
    console.log('✅ Newsletter indexes created');

    // OtpSession indexes
    console.log('Creating OtpSession indexes...');
    await OtpSession.collection.createIndex({ otpExpiry: 1 }, { expireAfterSeconds: 0 });
    await OtpSession.collection.createIndex({ sessionId: 1 });
    console.log('✅ OtpSession indexes created');

    console.log('\n✨ All indexes created successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating indexes:', err);
    process.exit(1);
  }
}

await createIndexes();
