const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function testAdminSave() {
  try {
    console.log("=== ADMIN SAVE TEST ===\n");

    // Step 1: Login as admin
    console.log("Step 1: Authenticating as admin...");
    const loginRes = await axios.post(`${API_URL}/staff-login`, {
      email: "admin@luxe.com",
      password: "admin123",
      role: "admin",
    });

    const token = loginRes.data.token;
    console.log("✓ Login successful");
    console.log("  Token:", token.substring(0, 20) + "...\n");

    // Step 2: Check current values
    console.log("Step 2: Checking current status levels...");
    const settingsRes = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const settings = settingsRes.data;
    console.log(
      "  regularMin:",
      settings.find((s) => s.key === "regularMin")?.value || 0
    );
    console.log(
      "  loyalMin:",
      settings.find((s) => s.key === "loyalMin")?.value || 0
    );
    console.log(
      "  vipMin:",
      settings.find((s) => s.key === "vipMin")?.value || 0
    );
    console.log();

    // Step 3: Save new values
    console.log("Step 3: Saving new status levels...");
    const newValues = [
      { key: "regularMin", value: 1000 },
      { key: "loyalMin", value: 6000000 },
      { key: "vipMin", value: 12000000 },
    ];

    for (const setting of newValues) {
      try {
        await axios.post(`${API_URL}/settings`, setting, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log(`  ✓ Saved ${setting.key} = ${setting.value}`);
      } catch (err) {
        console.error(
          `  ✗ Error saving ${setting.key}:`,
          err.response?.status,
          err.response?.data?.message
        );
        throw err;
      }
    }
    console.log();

    // Step 4: Verify changes
    console.log("Step 4: Verifying changes...");
    const verifyRes = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const updated = verifyRes.data;
    console.log(
      "  regularMin:",
      updated.find((s) => s.key === "regularMin")?.value || 0
    );
    console.log(
      "  loyalMin:",
      updated.find((s) => s.key === "loyalMin")?.value || 0
    );
    console.log(
      "  vipMin:",
      updated.find((s) => s.key === "vipMin")?.value || 0
    );
    console.log();

    console.log("✓ TEST PASSED - Admin can save status levels!");
  } catch (err) {
    console.error("✗ TEST FAILED");
    console.error("Error:", err.message);
    console.error("Full error:", err);
    if (err.response?.data) {
      console.error("Response:", err.response.data);
    }
    process.exit(1);
  }
}

await testAdminSave();
