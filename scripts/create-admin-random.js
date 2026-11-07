require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    let User;
    try {
      User = require('../model/user');
    } catch (e) {
      const userSchema = new mongoose.Schema({}, { strict: false });
      User = mongoose.model('User', userSchema, 'users');
    }

    // generate random email and password
    const rand = crypto.randomBytes(4).toString('hex');
    const email = `admin-${rand}@example.com`;
    const password = crypto.randomBytes(8).toString('base64').replace(/\W/g, 'A').slice(0,12);

    const exists = await User.findOne({ email });
    if (exists) {
      console.log('User already exists:', email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 12);
    // provide a minimal valid phone value to satisfy model validation if required
    const admin = new User({ email, password: hashed, name: 'Auto Admin', phone: '0000000000', role: 'admin', createdAt: new Date() });
    await admin.save();

    console.log('Created admin user:');
    console.log('  email:', email);
    console.log('  password:', password);
    console.log('  NOTE: store these credentials securely.');
  } catch (err) {
    console.error('Failed to create admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
