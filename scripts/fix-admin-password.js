require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for password fix');

    const email = 'admin-389bc03d@example.com';
    const plaintext = 'hJstnVfND3kA';
    const hashed = await bcrypt.hash(plaintext, 12);

    const usersColl = mongoose.connection.collection('users');
    const result = await usersColl.updateOne({ email }, { $set: { password: hashed } });
    console.log('Update result:', result.result || result);
  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
