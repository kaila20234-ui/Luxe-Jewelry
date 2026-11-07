const mongoose = require("mongoose");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const SaleSchema = new mongoose.Schema({}, { strict: false });

const Setting = mongoose.model("Setting", SettingsSchema);
const Sale = mongoose.model("Sale", SaleSchema);

mongoose
  .connect(uri)
  .then(async () => {
    // Get settings
    const settings = await Setting.find({});
    const regularMin = settings.find((s) => s.key === "regularMin")?.value || 0;
    const loyalMin =
      settings.find((s) => s.key === "loyalMin")?.value || 5000000;
    const vipMin = settings.find((s) => s.key === "vipMin")?.value || 10000000;

    console.log("=== STATUS LEVEL CONFIGURATION ===\n");
    console.log(`REGULAR: < ₦${regularMin.toLocaleString()}`);
    console.log(
      `LOYAL: ₦${loyalMin.toLocaleString()} - ₦${(vipMin - 1).toLocaleString()}`
    );
    console.log(`VIP: ≥ ₦${vipMin.toLocaleString()}`);

    // Get top customers
    const topCustomers = await Sale.aggregate([
      {
        $group: {
          _id: "$email",
          customerName: { $first: "$name" },
          totalSpent: { $sum: "$amount" },
          purchases: { $sum: 1 },
          lastPurchase: { $max: "$date" },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
    ]);

    console.log("\n=== CUSTOMER STATUS ANALYSIS ===\n");
    topCustomers.forEach((c, i) => {
      let status;
      if (c.totalSpent >= vipMin) {
        status = "✓ VIP";
      } else if (c.totalSpent >= loyalMin) {
        status = "✓ LOYAL";
      } else {
        status = "✓ REGULAR";
      }

      console.log(`${i + 1}. ${c.customerName}`);
      console.log(`   Email: ${c._id}`);
      console.log(`   Total Spent: ₦${c.totalSpent.toLocaleString()}`);
      console.log(`   Status: ${status}`);
      console.log("");
    });

    process.exit(0);
  })
  .catch((error_) => {
    console.error("Error:", error_.message);
    process.exit(1);
  });
