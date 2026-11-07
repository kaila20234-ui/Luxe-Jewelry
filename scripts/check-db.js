require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for verification');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const pCount = await Product.countDocuments();
    const uCount = await User.countDocuments();
    console.log('Products:', pCount);
    console.log('Users:', uCount);

    const manager = await User.findOne({ email: 'manager@example.com' });
    console.log('Manager found:', !!manager, manager ? { email: manager.email, role: manager.role } : null);

    const admin = await User.findOne({ role: 'admin' });
    console.log('Any admin in DB:', !!admin, admin ? { email: admin.email, role: admin.role } : null);

  } catch (e) {
    console.error('Check DB error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();