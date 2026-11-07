// ============================================
// MONGODB DATABASE MIGRATION SCRIPT
// ============================================
// Purpose: Connect to MongoDB and run all migration commands
// Usage: node migrate.js
// ============================================

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/siwes_project';

async function runMigration() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = mongoose.connection.db;

    // ============================================
    // STEP 1: Create users collection
    // ============================================
    console.log('📝 STEP 1: Creating users collection...');
    try {
      await db.createCollection('users');
      console.log('✅ Users collection created\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Users collection already exists\n');
      } else {
        throw err;
      }
    }

    // ============================================
    // STEP 2: Create indexes for users
    // ============================================
    console.log('📝 STEP 2: Creating indexes for users collection...');
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('✅ Index on email created');

      await db.collection('users').createIndex({ createdAt: 1 });
      console.log('✅ Index on createdAt created');

      await db.collection('users').createIndex({ emailVerified: 1 });
      console.log('✅ Index on emailVerified created\n');
    } catch (err) {
      console.log('⚠️  Some indexes may already exist\n');
    }

    // ============================================
    // STEP 3: Update sales collection
    // ============================================
    console.log('📝 STEP 3: Updating sales collection with userId field...');
    try {
      const salesResult = await db.collection('sales').updateMany(
        {},
        [{ $set: { userId: null } }]
      );
      console.log(`✅ Updated ${salesResult.modifiedCount} sales documents`);

      // Create indexes on sales
      await db.collection('sales').createIndex({ userId: 1 });
      console.log('✅ Index on userId created');

      await db.collection('sales').createIndex({ reference: 1 }, { unique: true });
      console.log('✅ Index on reference created');

      await db.collection('sales').createIndex({ date: 1 });
      console.log('✅ Index on date created');

      await db.collection('sales').createIndex({ status: 1 });
      console.log('✅ Index on status created');

      await db.collection('sales').createIndex({ userId: 1, date: 1 });
      console.log('✅ Compound index on userId+date created\n');
    } catch (err) {
      console.log('⚠️  Sales update warning:', err.message, '\n');
    }

    // ============================================
    // STEP 4: Update otpsessions collection
    // ============================================
    console.log('📝 STEP 4: Updating otpsessions collection with userId field...');
    try {
      const otpResult = await db.collection('otpsessions').updateMany(
        {},
        [{ $set: { userId: null } }]
      );
      console.log(`✅ Updated ${otpResult.modifiedCount} OTP session documents`);

      // Create indexes on otpsessions
      await db.collection('otpsessions').createIndex({ sessionId: 1 }, { unique: true });
      console.log('✅ Index on sessionId created');

      await db.collection('otpsessions').createIndex({ userId: 1 });
      console.log('✅ Index on userId created');

      await db.collection('otpsessions').createIndex({ otpExpiry: 1 }, { expireAfterSeconds: 0 });
      console.log('✅ TTL index on otpExpiry created');

      await db.collection('otpsessions').createIndex({ verified: 1 });
      console.log('✅ Index on verified created\n');
    } catch (err) {
      console.log('⚠️  OtpSessions update warning:', err.message, '\n');
    }

    // ============================================
    // STEP 5: Verification
    // ============================================
    console.log('📊 VERIFICATION & STATISTICS:');
    console.log('================================\n');

    // Count users
    const userCount = await db.collection('users').countDocuments();
    console.log(`📌 Users: ${userCount} document(s)`);

    // Count sales
    const salesCount = await db.collection('sales').countDocuments();
    const salesWithUserId = await db.collection('sales').countDocuments({ userId: { $ne: null } });
    const guestSales = await db.collection('sales').countDocuments({ userId: null });
    console.log(`📌 Sales: ${salesCount} total (${salesWithUserId} customer orders, ${guestSales} guest orders)`);

    // Count otpsessions
    const otpCount = await db.collection('otpsessions').countDocuments();
    console.log(`📌 OTP Sessions: ${otpCount} document(s)\n`);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📌 Total Collections: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    console.log('\n');

    // Get indexes
    console.log('📌 Users Indexes:');
    const userIndexes = await db.collection('users').listIndexes().toArray();
    userIndexes.forEach(idx => {
      console.log(`   - ${JSON.stringify(idx)}`);
    });

    console.log('\n📌 Sales Indexes:');
    const salesIndexes = await db.collection('sales').listIndexes().toArray();
    salesIndexes.forEach(idx => {
      console.log(`   - ${JSON.stringify(idx)}`);
    });

    console.log('\n📌 OtpSessions Indexes:');
    const otpIndexes = await db.collection('otpsessions').listIndexes().toArray();
    otpIndexes.forEach(idx => {
      console.log(`   - ${JSON.stringify(idx)}`);
    });

    // ============================================
    // Sample Document Check
    // ============================================
    console.log('\n\n📄 SAMPLE DOCUMENTS:');
    console.log('================================\n');

    const sampleUser = await db.collection('users').findOne();
    console.log('Sample User Document:');
    console.log(JSON.stringify(sampleUser, null, 2) || 'No users found yet\n');

    const sampleSale = await db.collection('sales').findOne();
    console.log('\nSample Sale Document:');
    console.log(JSON.stringify(sampleSale, null, 2) || 'No sales found yet\n');

    const sampleOtp = await db.collection('otpsessions').findOne();
    console.log('\nSample OTP Session Document:');
    console.log(JSON.stringify(sampleOtp, null, 2) || 'No OTP sessions found yet\n');

    // ============================================
    // Success Message
    // ============================================
    console.log('\n✅ ✅ ✅ MIGRATION COMPLETED SUCCESSFULLY! ✅ ✅ ✅');
    console.log('\nYour database is now ready for customer login feature!');
    console.log('\nNext Steps:');
    console.log('1. Start your server: npm run dev');
    console.log('2. Go to http://localhost:5000');
    console.log('3. Click "Login" button to register a new account');
    console.log('4. Test the dashboard and checkout');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
runMigration();
