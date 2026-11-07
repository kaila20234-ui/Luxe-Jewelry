require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for verification');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const email = process.env.TEST_ADMIN_EMAIL || 'admin-389bc03d@example.com';
    const password = process.env.TEST_ADMIN_PASSWORD;
    
    if (!password) {
      console.log('TEST_ADMIN_PASSWORD environment variable not set. Skipping verification.');
      process.exit(0);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('Admin user not found in DB:', email);
      process.exit(0);
    }

    const match = await bcrypt.compare(password, user.password);
    console.log('User found:', { email: user.email, role: user.role });
    console.log('Password match:', match);
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
