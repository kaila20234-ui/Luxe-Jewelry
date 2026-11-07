/**
 * End-to-End Test: Admin Save Status Levels
 * Tests the complete flow: login → save settings → verify database → check API
 */

const axios = require("axios");

const API_URL = "http://127.0.0.1:5000/api";
let adminToken = null;

async function test() {
  try {
    console.log("\n=== END-TO-END STATUS LEVELS TEST ===\n");

    // Step 1: Admin Login
    console.log("✓ Step 1: Admin authenticating...");
    try {
      const loginRes = await axios.post(`${API_URL}/staff-login`, {
        email: "admin@luxe.com",
        password: "admin123",
        role: "admin",
      });

      adminToken = loginRes.data.token;
      console.log("  ✓ Authentication successful\n");
    } catch (loginError_) {
      console.error(
        "  ✗ Login failed:",
        loginError_.response?.data || loginError_.message
      );
      throw loginError_;
    }

    // Step 2: Fetch current settings
    console.log("✓ Step 2: Fetching current status levels...");
    const currentRes = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const current = currentRes.data;
    const regularMin = current.find((s) => s.key === "regularMin")?.value || 0;
    const loyalMin = current.find((s) => s.key === "loyalMin")?.value || 0;
    const vipMin = current.find((s) => s.key === "vipMin")?.value || 0;

    console.log(`  Current values:`);
    console.log(`    regularMin: ${regularMin}`);
    console.log(`    loyalMin: ${loyalMin}`);
    console.log(`    vipMin: ${vipMin}\n`);

    // Step 3: Save NEW values
    console.log("✓ Step 3: Saving NEW status levels...");
    const newRegularMin = regularMin + 500;
    const newLoyalMin = loyalMin + 500000;
    const newVipMin = vipMin + 500000;

    const settingsToSave = [
      { key: "regularMin", value: newRegularMin },
      { key: "loyalMin", value: newLoyalMin },
      { key: "vipMin", value: newVipMin },
    ];

    for (const setting of settingsToSave) {
      const saveRes = await axios.post(`${API_URL}/settings`, setting, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      });

      if (saveRes.data.success) {
        console.log(`  ✓ Saved ${setting.key} = ${setting.value}`);
      } else {
        throw new Error(
          `Failed to save ${setting.key}: ${saveRes.data.message}`
        );
      }
    }
    console.log();

    // Step 4: Verify changes in database
    console.log("✓ Step 4: Verifying changes were saved to database...");
    const verifyRes = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const verified = verifyRes.data;
    const verifiedRegularMin =
      verified.find((s) => s.key === "regularMin")?.value || 0;
    const verifiedLoyalMin =
      verified.find((s) => s.key === "loyalMin")?.value || 0;
    const verifiedVipMin = verified.find((s) => s.key === "vipMin")?.value || 0;

    console.log(`  Verified values:`);
    console.log(
      `    regularMin: ${verifiedRegularMin} ${
        verifiedRegularMin === newRegularMin ? "✓" : "✗"
      }`
    );
    console.log(
      `    loyalMin: ${verifiedLoyalMin} ${
        verifiedLoyalMin === newLoyalMin ? "✓" : "✗"
      }`
    );
    console.log(
      `    vipMin: ${verifiedVipMin} ${
        verifiedVipMin === newVipMin ? "✓" : "✗"
      }\n`
    );

    if (
      verifiedRegularMin === newRegularMin &&
      verifiedLoyalMin === newLoyalMin &&
      verifiedVipMin === newVipMin
    ) {
      console.log("✓ Step 5: Checking if public API reflects changes...");
      const publicRes = await axios.get(`${API_URL}/settings`);
      const publicData = publicRes.data;
      const publicRegularMin =
        publicData.find((s) => s.key === "regularMin")?.value || 0;
      const publicLoyalMin =
        publicData.find((s) => s.key === "loyalMin")?.value || 0;
      const publicVipMin =
        publicData.find((s) => s.key === "vipMin")?.value || 0;

      console.log(`  Public API values (no auth required):`);
      console.log(
        `    regularMin: ${publicRegularMin} ${
          publicRegularMin === newRegularMin ? "✓" : "✗"
        }`
      );
      console.log(
        `    loyalMin: ${publicLoyalMin} ${
          publicLoyalMin === newLoyalMin ? "✓" : "✗"
        }`
      );
      console.log(
        `    vipMin: ${publicVipMin} ${
          publicVipMin === newVipMin ? "✓" : "✗"
        }\n`
      );

      console.log(
        "✅ TEST PASSED - Admin can save status levels and changes persist!\n"
      );

      // Reset to original values
      console.log("Resetting to original values...");
      const resetSettings = [
        { key: "regularMin", value: 0 },
        { key: "loyalMin", value: 5000000 },
        { key: "vipMin", value: 10000000 },
      ];

      for (const setting of resetSettings) {
        await axios.post(`${API_URL}/settings`, setting, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      console.log("Reset complete.\n");
    } else {
      console.error("❌ TEST FAILED - Values were not saved correctly");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ TEST FAILED");
    console.error(`Error message: ${err.message}`);
    console.error(`Error code: ${err.code}`);
    console.error(`Error status: ${err.status}`);
    if (err.response) {
      console.error(`Response status: ${err.response.status}`);
      console.error(`Response data:`, err.response.data);
    }
    console.error(`Full error:`, err);
    process.exit(1);
  }
}

await test();
