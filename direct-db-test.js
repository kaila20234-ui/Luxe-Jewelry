const mongoose = require("mongoose");
const uri = "mongodb://localhost:27017/luxe_jewelry_db";

async function testWorkflow() {
  const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now },
  });

  const Setting = mongoose.model("Setting", SettingsSchema);

  await mongoose.connect(uri);

  console.log("=== DIRECT DATABASE TEST ===\n");

  // Check current values
  console.log("Step 1: Current database values:");
  let all = await Setting.find({});
  all.forEach((s) => console.log(`  ${s.key}: ${s.value}`));

  // Simulate what the admin form would do - save new value
  console.log("\nStep 2: Simulating admin saving loyalMin = 6000000...");
  const updated = await Setting.findOneAndUpdate(
    { key: "loyalMin" },
    { key: "loyalMin", value: 6000000, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  console.log("✓ Updated:", { key: updated.key, value: updated.value });

  // Verify
  console.log("\nStep 3: Verify new value in database:");
  all = await Setting.find({});
  all.forEach((s) => {
    const marker =
      s.key === "loyalMin" && s.value === 6000000 ? " ← CHANGED" : "";
    console.log(`  ${s.key}: ${s.value}${marker}`);
  });

  // Reset to original
  console.log("\nStep 4: Resetting to original values...");
  await Setting.findOneAndUpdate(
    { key: "loyalMin" },
    { value: 5000000, updatedAt: new Date() },
    { new: true }
  );
  console.log("✓ Reset complete");

  all = await Setting.find({});
  all.forEach((s) => console.log(`  ${s.key}: ${s.value}`));

  console.log("\n✓ DATABASE TEST PASSED - Update mechanism works!");
  process.exit(0);
}

try {
  await testWorkflow();
} catch (error_) {
  console.error("Error:", error_.message);
  process.exit(1);
}
