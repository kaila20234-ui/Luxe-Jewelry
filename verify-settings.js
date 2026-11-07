const mongoose = require("mongoose");
const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/luxe_jewelry_db";

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const Setting = mongoose.model("Setting", SettingsSchema);

mongoose
  .connect(uri)
  .then(async () => {
    const settings = await Setting.find({}).sort({ key: 1 });

    console.log("\n=== CURRENT DATABASE VALUES ===\n");
    settings.forEach((s) => {
      const formatted = s.value ? s.value.toLocaleString() : "undefined";
      console.log(`${s.key}: ${s.value} (formatted: ₦${formatted})`);
    });

    // Check status levels specifically
    console.log("\n=== STATUS LEVEL VERIFICATION ===\n");
    const regularMin = settings.find((s) => s.key === "regularMin")?.value || 0;
    const loyalMin =
      settings.find((s) => s.key === "loyalMin")?.value || 5000000;
    const vipMin = settings.find((s) => s.key === "vipMin")?.value || 10000000;

    console.log(`REGULAR minimum: ₦${regularMin.toLocaleString()}`);
    console.log(`LOYAL minimum:   ₦${loyalMin.toLocaleString()}`);
    console.log(`VIP minimum:     ₦${vipMin.toLocaleString()}`);

    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection Error:", err.message);
    process.exit(1);
  });
