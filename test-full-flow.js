const http = require("node:http");

console.log("=== TESTING STATUS LEVEL SAVE WORKFLOW ===\n");

// Test data
const adminToken = "test-token"; // We'll get a real one

// First, try to log in as admin to get a token
const loginPayload = JSON.stringify({
  email: "admin@luxe.com",
  password: "admin123",
  role: "admin",
});

console.log("Step 1: Attempting admin login...");
const loginReq = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/staff-login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(loginPayload),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const result = JSON.parse(data);
        if (result.success && result.token) {
          console.log("✓ Login successful, got token");
          const token = result.token;

          // Now test saving a setting
          console.log(
            "\nStep 2: Saving new status level (loyalMin = 6000000)..."
          );
          saveSetting(token, "loyalMin", 6000000);
        } else {
          console.log("✗ Login failed:", result.message);
          console.log("Response:", data);
          process.exit(1);
        }
      } catch (err) {
        console.log("✗ Parse error:", err.message);
        console.log("Response:", data);
        process.exit(1);
      }
    });
  }
);

loginReq.on("error", (err) => {
  console.error("✗ Login request error:", err.message);
  process.exit(1);
});

loginReq.write(loginPayload);
loginReq.end();

function saveSetting(token, key, value) {
  const payload = JSON.stringify({ key, value });

  const req = http.request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/settings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          console.log("Response status:", res.statusCode);
          const result = JSON.parse(data);
          console.log("Response body:", result);

          if (result.success) {
            console.log("✓ Setting saved successfully");

            // Verify in database
            console.log("\nStep 3: Verifying database...");
            verifySetting(key, value);
          } else {
            console.log("✗ Save failed:", result.message);
            process.exit(1);
          }
        } catch (err) {
          console.log("✗ Parse error:", err.message);
          console.log("Response:", data);
          process.exit(1);
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("✗ Save request error:", err.message);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

function verifySetting(key, value) {
  const mongoose = require("mongoose");
  const uri = "mongodb://localhost:27017/luxe_jewelry_db";

  const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now },
  });

  const Setting = mongoose.model("Setting", SettingsSchema);

  mongoose
    .connect(uri)
    .then(async () => {
      const setting = await Setting.findOne({ key });

      if (setting && setting.value === value) {
        console.log(`✓ Database verified: ${key} = ${value}`);
      } else {
        console.log(
          `✗ Database mismatch: expected ${value}, got ${
            setting?.value || "not found"
          }`
        );
      }

      // Show all settings
      console.log("\nAll current settings in database:");
      const all = await Setting.find({});
      all.forEach((s) => {
        console.log(`  ${s.key}: ${s.value}`);
      });

      process.exit(0);
    })
    .catch((err) => {
      console.error("✗ Database error:", err.message);
      process.exit(1);
    });
}
