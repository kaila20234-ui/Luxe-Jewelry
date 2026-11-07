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
    // Update with correct values
    const correct = [
      { key: "regularMin", value: 0 },
      { key: "loyalMin", value: 5000000 },
      { key: "vipMin", value: 10000000 },
    ];

    console.log("Resetting status levels to correct values:");
    for (const setting of correct) {
      const updated = await Setting.findOneAndUpdate(
        { key: setting.key },
        { value: setting.value, updatedAt: new Date() },
        { new: true }
      );
      console.log(`✓ ${setting.key}: ${updated.value}`);
    }

    const allSettings = await Setting.find({});
    console.log("\nAll Settings after update:");
    allSettings.forEach((s) => {
      console.log(`  ${s.key}: ${s.value}`);
    });

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
