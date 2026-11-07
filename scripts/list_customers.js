require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('[SCRIPT] Connected to MongoDB');
    const User = require(path.join(__dirname, '..', 'model', 'user'));
    const customers = await User.find({ role: 'customer' }).select('-password').lean();
    console.log('[SCRIPT] Customers found:', customers.length);
    if (customers.length > 0) {
      console.log(customers.slice(0, 5));
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[SCRIPT] Error:', e);
    process.exit(2);
  }
})();