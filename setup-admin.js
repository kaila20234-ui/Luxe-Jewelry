const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/luxe_jewelry';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✓ Connected to MongoDB');

  // Define User schema inline
  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    username: String,
    password: { type: String, required: true, select: false },
    name: String,
    phone: String,
    role: { type: String, enum: ['customer', 'admin', 'manager'], default: 'customer' },
    createdAt: { type: Date, default: Date.now }
  });

  const User = mongoose.model('User', UserSchema);

  try {
    // Admin email and password from .env
    const adminEmail = 'admin@luxejewelry.com';
    const adminPassword = 'LUXEJEWELRY@123';
    const adminName = 'Admin User';

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('✓ Password hashed');

    // Create or update admin user
    const admin = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        name: adminName,
        role: 'admin',
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('✓ Admin account created/updated successfully');
    console.log('');
    console.log('LOGIN CREDENTIALS:');
    console.log('  Email:', adminEmail);
    console.log('  Password:', adminPassword);
    console.log('  Role: admin');
    console.log('');
    console.log('Login URL: http://localhost:5000/admin-login.html');

    // Show all staff
    const staff = await User.find({ role: { $in: ['admin', 'manager'] } }).select('-password');
    console.log('');
    console.log('All staff accounts:');
    staff.forEach(s => {
      console.log(`  - ${s.email} (${s.role})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
});
