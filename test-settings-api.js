const http = require("node:http");

// First, get an admin token for testing
const tokenTestData = {
  email: "admin@luxe.com",
  password: "admin123",
  role: "admin",
};

const loginReq = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/staff-login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const result = JSON.parse(data);
        if (result.success && result.token) {
          console.log("✓ Got admin token");
          // Now fetch settings
          fetchSettings(result.token);
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
  console.error("Login request error:", err.message);
  process.exit(1);
});

loginReq.write(JSON.stringify(tokenTestData));
loginReq.end();

function fetchSettings(token) {
  const settingsReq = http.request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/settings",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const settings = JSON.parse(data);
          console.log("\n=== API RESPONSE ===\n");
          console.log(JSON.stringify(settings, null, 2));

          const regularMin = settings.find(
            (s) => s.key === "regularMin"
          )?.value;
          const loyalMin = settings.find((s) => s.key === "loyalMin")?.value;
          const vipMin = settings.find((s) => s.key === "vipMin")?.value;

          console.log("\n=== PARSED VALUES ===\n");
          console.log(`regularMin: ${regularMin}`);
          console.log(`loyalMin: ${loyalMin}`);
          console.log(`vipMin: ${vipMin}`);

          process.exit(0);
        } catch (err) {
          console.error("Parse error:", err.message);
          console.log("Response:", data);
          process.exit(1);
        }
      });
    }
  );

  settingsReq.on("error", (err) => {
    console.error("Settings request error:", err.message);
    process.exit(1);
  });

  settingsReq.end();
}
