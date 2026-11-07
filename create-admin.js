const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const StaffSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ["admin", "manager"], required: true },
  createdAt: { type: Date, default: Date.now },
});

const Staff = mongoose.model("Staff", StaffSchema);

mongoose
  .connect(uri)
  .then(async () => {
    console.log("Creating admin account...");

    // Get password from environment variable with fallback for development
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.SITE_ADMIN_PASS || "ChangeMe@123";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@luxe.com";
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin
    const admin = await Staff.findOneAndUpdate(
      { email: adminEmail },
      {
        email: adminEmail,
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log("✓ Admin account created/updated");
    console.log("  Email:", admin.email);
    console.log("  Role:", admin.role);
    console.log("  Password: Use the value from SITE_ADMIN_PASS environment variable");

    // Show all staff
    const allStaff = await Staff.find({});
    console.log("\nAll staff accounts:");
    allStaff.forEach((s) => {
      console.log(`  - ${s.email} (${s.role})`);
    });

    process.exit(0);
  })
  .catch((error_) => {
    console.error("Error:", error_.message);
    process.exit(1);
  });
