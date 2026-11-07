const mongoose = require('mongoose');
const User = require('./model/user');

async function recreateAccounts() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/luxe_jewelry');
    
    // Delete old accounts
    await User.deleteOne({ email: 'admin@luxejewelry.com' });
    await User.deleteOne({ email: 'manager@luxejewelry.com' });
    console.log('✅ Cleaned up old accounts');
    
    // Create admin - DO NOT hash, Mongoose hook will do it
    const admin = new User({
      email: 'admin@luxejewelry.com',
      username: 'admin',
      password: 'Admin@123456',  // Let Mongoose hook hash this
      name: 'Admin User',
      phone: '08000000000',
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Admin created with password: Admin@123456');
    
    // Create manager - DO NOT hash, Mongoose hook will do it
    const manager = new User({
      email: 'manager@luxejewelry.com',
      username: 'manager',
      password: 'Manager@123456',  // Let Mongoose hook hash this
      name: 'Manager User',
      phone: '08111111111',
      role: 'manager'
    });
    await manager.save();
    console.log('✅ Manager created with password: Manager@123456');
    
    // Verify by using the comparePassword method
    console.log('\n=== VERIFICATION ===');
    const adminCheck = await User.findOne({email: 'admin@luxejewelry.com'}).select('+password');
    const managerCheck = await User.findOne({email: 'manager@luxejewelry.com'}).select('+password');
    
    const adminMatch = await adminCheck.comparePassword('Admin@123456');
    const managerMatch = await managerCheck.comparePassword('Manager@123456');
    
    console.log('Admin password works:', adminMatch ? '✓' : '✗');
    console.log('Manager password works:', managerMatch ? '✓' : '✗');
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.disconnect();
  }
}

await recreateAccounts();
