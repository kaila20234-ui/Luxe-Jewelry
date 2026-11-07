const mongoose = require("mongoose");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const CustomerSchema = new mongoose.Schema({
  email: String,
  name: String,
  purchases: Number,
  totalSpent: Number,
  lastPurchase: Date,
});

const Setting = mongoose.model("Setting", SettingsSchema);
const Customer = mongoose.model("Customer", CustomerSchema);

mongoose
  .connect(uri)
  .then(async () => {
    // Get settings
    const settings = await Setting.find({});
    const regularMin = settings.find((s) => s.key === "regularMin")?.value || 0;
    const loyalMin =
      settings.find((s) => s.key === "loyalMin")?.value || 5000000;
    const vipMin = settings.find((s) => s.key === "vipMin")?.value || 10000000;

    console.log("\n=== STATUS LEVEL THRESHOLDS ===\n");
    console.log(`REGULAR: below ₦${regularMin.toLocaleString()}`);
    console.log(
      `LOYAL: ₦${loyalMin.toLocaleString()} - ₦${(vipMin - 1).toLocaleString()}`
    );
    console.log(`VIP: ₦${vipMin.toLocaleString()}+`);

    // Get top customers
    const topCustomersResult = await Customer.collection
      .aggregate([
        {
          $group: {
            _id: "$email",
            customerName: { $first: "$name" },
            purchases: { $sum: 1 },
            totalSpent: { $sum: "$totalSpent" },
            lastPurchase: { $max: "$createdAt" },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    console.log("\n=== TOP CUSTOMERS & STATUS ===\n");
    topCustomersResult.forEach((customer, idx) => {
      let status;
      if (customer.totalSpent >= vipMin) {
        status = "VIP";
      } else if (customer.totalSpent >= loyalMin) {
        status = "LOYAL";
      } else {
        status = "REGULAR";
      }

      console.log(`${idx + 1}. ${customer.customerName || "Customer"}`);
      console.log(`   Email: ${customer._id}`);
      console.log(`   Spent: ₦${customer.totalSpent.toLocaleString()}`);
      console.log(`   Status: ${status}`);
      console.log("");
    });

    process.exit(0);
  })
  .catch((error_) => {
    console.error("Error:", error_.message);
    process.exit(1);
  });
