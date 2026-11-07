// test-referral-data.js - Verify referral data in database
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./model/user');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry');
    
    // Get sample user with referrals
    const user = await User.findOne({ referralCode: { $exists: true, $ne: null } })
      .populate('referredBy', 'name email referralCode')
      .populate('referrals', 'name email referralCode createdAt');
    
    console.log('[TEST] Sample user with referral data:');
    console.log('- Email:', user.email);
    console.log('- Referral Code:', user.referralCode);
    console.log('- Referral Count:', user.referralCount);
    console.log('- Referred By:', user.referredBy);
    
    // Count total referrals
    const totalRefs = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$referralCount' } } }
    ]);
    
    console.log('[TEST] Total referral count across all users:', totalRefs[0]?.total || 0);
    
    // Count users with referral codes
    const usersWithCode = await User.countDocuments({ referralCode: { $exists: true, $ne: null } });
    console.log('[TEST] Users with referral codes:', usersWithCode);
    
    await mongoose.connection.close();
    console.log('[TEST] Done');
  } catch (err) {
    console.error('[TEST] Error:', err.message);
    process.exit(1);
  }
})();
