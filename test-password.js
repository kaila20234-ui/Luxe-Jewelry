const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function testPassword() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/luxe_jewelry');
    const User = require('./model/user');
    
    // Test manager credentials
    const manager = await User.findOne({email: 'manager@luxejewelry.com'}).select('+password');
    
    console.log('=== PASSWORD TEST ===');
    console.log('Email:', manager.email);
    console.log('Role:', manager.role);
    console.log('Password hash:', manager.password.substring(0, 30) + '...');
    
    // Try comparing with known password
    const testPassword = 'Manager@123456';
    console.log('\nTesting password:', testPassword);
    
    const match = await bcrypt.compare(testPassword, manager.password);
    console.log('Password match:', match);
    
    if (match) {
      console.log('✓ Password matches correctly');
    } else {
      console.log('❌ Password does not match! This is the issue.');
      console.log('\nTrying alternate passwords...');
      const attempts = ['Manager@123456', 'manager@123456', 'Manager123456', 'manager'];
      for (const pwd of attempts) {
        const m = await bcrypt.compare(pwd, manager.password);
        console.log(`  "${pwd}": ${m ? '✓ MATCH' : '✗ no'}`);
      }
    }
    
    mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    mongoose.disconnect();
  }
}

await testPassword();
