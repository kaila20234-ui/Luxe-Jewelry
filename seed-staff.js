// seed-staff.js - Create admin and manager accounts in database
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/luxe_jewelry";

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
  phone: String,
  role: { type: String, default: 'customer' }
});

const User = mongoose.model('User', userSchema);

async function seedStaff() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminEmail = 'admin@luxejewelry.com';
    const adminPassword = 'Admin@123456';
    
    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      console.log(`⚠️  Admin account already exists: ${adminEmail}`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      admin = new User({
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        name: 'Admin User',
        phone: '',
        role: 'admin'
      });
      await admin.save();
      console.log(`✅ Admin account created: ${adminEmail}`);
    }

    // Create manager user
    const managerEmail = 'manager@luxejewelry.com';
    const managerPassword = 'Manager@123456';
    
    let manager = await User.findOne({ email: managerEmail });
    if (manager) {
      console.log(`⚠️  Manager account already exists: ${managerEmail}`);
    } else {
      const hashedPassword = await bcrypt.hash(managerPassword, 12);
      manager = new User({
        email: managerEmail,
        username: 'manager',
        password: hashedPassword,
        name: 'Manager User',
        phone: '',
        role: 'manager'
      });
      await manager.save();
      console.log(`✅ Manager account created: ${managerEmail}`);
    }

    console.log('\n✅ Staff accounts seeding completed!');
    console.log('\nLogin credentials:');
    console.log(`Admin:   ${adminEmail} / ${adminPassword}`);
    console.log(`Manager: ${managerEmail} / ${managerPassword}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding staff:', error.message);
    process.exit(1);
  }
}

await seedStaff();
