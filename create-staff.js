require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Simple User schema inline
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  username: String,
  password: String,
  name: String,
  phone: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

async function createStaffUsers() {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/luxe_jewelry";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create admin user
    const adminExists = await User.findOne({ email: "admin@luxejewelry.com" });
    if (adminExists) {
      console.log("⚠️  admin@luxejewelry.com already exists");
    } else {
      const adminHash = await bcrypt.hash("Admin@123456", 12);
      await User.create({
        email: "admin@luxejewelry.com",
        username: "admin",
        password: adminHash,
        name: "Admin User",
        phone: "",
        role: "admin"
      });
      console.log("✅ Created admin@luxejewelry.com with password: Admin@123456");
    }

    // Create manager user
    const managerExists = await User.findOne({ email: "manager@luxejewelry.com" });
    if (managerExists) {
      console.log("⚠️  manager@luxejewelry.com already exists");
    } else {
      const managerHash = await bcrypt.hash("Manager@123456", 12);
      await User.create({
        email: "manager@luxejewelry.com",
        username: "manager",
        password: managerHash,
        name: "Manager User",
        phone: "",
        role: "manager"
      });
      console.log("✅ Created manager@luxejewelry.com with password: Manager@123456");
    }

    console.log("\n📋 Staff Credentials:");
    console.log("  Admin:   admin@luxejewelry.com / Admin@123456");
    console.log("  Manager: manager@luxejewelry.com / Manager@123456");

    await mongoose.connection.close();
    console.log("✅ Done");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createStaffUsers().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
