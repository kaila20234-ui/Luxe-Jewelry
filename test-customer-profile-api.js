// test-customer-profile-api.js - Test customer profile endpoint
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./model/user');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry');
    
    // Get a customer user
    const user = await User.findOne({ role: 'customer', referralCode: { $exists: true, $ne: null } });
    
    if (!user) {
      console.log('[TEST] No customer found with referral code');
      await mongoose.connection.close();
      return;
    }
    
    console.log('[TEST] Raw user object:');
    console.log(JSON.stringify(user.toJSON(), null, 2));
    
    console.log('[TEST] \nChecking referral fields in toJSON():');
    const userJSON = user.toJSON();
    console.log('- referralCode:', userJSON.referralCode);
    console.log('- referralCount:', userJSON.referralCount);
    console.log('- referredBy:', userJSON.referredBy);
    
    await mongoose.connection.close();
    console.log('[TEST] Done');
  } catch (err) {
    console.error('[TEST] Error:', err.message);
    process.exit(1);
  }
})();
