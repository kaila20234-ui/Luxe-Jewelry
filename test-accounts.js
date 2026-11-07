const mongoose = require('mongoose');

async function testAccounts() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/luxe_jewelry');
    const User = require('./model/user');
    
    const admin = await User.findOne({email: 'admin@luxejewelry.com'}).select('+password');
    const manager = await User.findOne({email: 'manager@luxejewelry.com'}).select('+password');
    
    console.log('=== ACCOUNT CHECK ===');
    console.log('Admin:', {exists: !!admin, email: admin?.email, role: admin?.role, hasPassword: !!admin?.password});
    console.log('Manager:', {exists: !!manager, email: manager?.email, role: manager?.role, hasPassword: !!manager?.password});
    
    if (!admin?.password) console.log('❌ ADMIN: Password hash missing!');
    if (!manager?.password) console.log('❌ MANAGER: Password hash missing!');
    
    mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

await testAccounts();
