require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import User model
const User = require('./model/user');

async function createStaffAccounts() {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/luxe_jewelry";
    
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create Admin Account
    console.log("\n📝 Creating admin account...");
    const adminExists = await User.findOne({ email: 'admin@luxejewelry.com' });
    
    if (adminExists) {
      console.log("⚠️  Admin account already exists");
    } else {
      const adminPassword = await bcrypt.hash('Admin@123456', 12);
      const adminUser = new User({
        email: 'admin@luxejewelry.com',
        username: 'admin',
        password: adminPassword,
        name: 'Admin User',
        phone: '+234-admin-001',
        role: 'admin'
      });
      await adminUser.save();
      console.log("✅ Admin account created successfully!");
      console.log("   Email: admin@luxejewelry.com");
      console.log("   Password: Admin@123456");
      console.log("   Role: admin");
    }

    // Create Manager Account
    console.log("\n📝 Creating manager account...");
    const managerExists = await User.findOne({ email: 'manager@luxejewelry.com' });
    
    if (managerExists) {
      console.log("⚠️  Manager account already exists");
    } else {
      const managerPassword = await bcrypt.hash('Manager@123456', 12);
      const managerUser = new User({
        email: 'manager@luxejewelry.com',
        username: 'manager',
        password: managerPassword,
        name: 'Manager User',
        phone: '+234-manager-001',
        role: 'manager'
      });
      await managerUser.save();
      console.log("✅ Manager account created successfully!");
      console.log("   Email: manager@luxejewelry.com");
      console.log("   Password: Manager@123456");
      console.log("   Role: manager");
    }

    console.log("\n✨ Staff accounts setup complete!");
    
    // Verify accounts
    console.log("\n🔍 Verifying accounts...");
    const admin = await User.findOne({ email: 'admin@luxejewelry.com' });
    const manager = await User.findOne({ email: 'manager@luxejewelry.com' });
    
    console.log(`✅ Admin account found: ${admin ? 'YES' : 'NO'}`);
    console.log(`✅ Manager account found: ${manager ? 'YES' : 'NO'}`);

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

await createStaffAccounts();
