require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[SCRIPT] Connected to MongoDB');
    const User = require(path.join(__dirname, '..', 'model', 'user'));
    const email = 'testcustomer@example.com';
    let u = await User.findOne({ email });
    if (u) {
      console.log('[SCRIPT] Customer already exists:', u.email);
      await mongoose.disconnect();
      process.exit(0);
    }
    u = new User({ email, password: 'custpass123', name: 'Test Customer', phone: '', role: 'customer' });
    await u.save();
    console.log('[SCRIPT] Created customer:', u.email);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[SCRIPT] Error:', e);
    process.exit(2);
  }
})();