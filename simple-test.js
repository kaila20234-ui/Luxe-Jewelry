const express = require("express");

const app = express();
const PORT = 5000;

app.get("/test", (req, res) => {
  res.json({ test: "ok" });
});

console.log("[TEST] Creating server...");
const server = app.listen(PORT, () => {
  console.log(`[TEST] Server running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error(`[TEST-ERROR] ${err.code}: ${err.message}`);
  process.exit(1);
});

console.log("[TEST] Server setup complete");

// Keep running for 30 seconds
setTimeout(() => {
  console.log("[TEST] Timeout - exiting");
  process.exit(0);
}, 30000);
