const net = require("net");

const socket = net.createConnection({ host: "127.0.0.1", port: 5001 }, () => {
  console.log("✓ Connected to server on port 5001");
  process.exit(0);
});

socket.on("error", (err) => {
  console.error("✗ Connection failed:", err.code);
  process.exit(1);
});

setTimeout(() => {
  console.error("✗ Connection timeout");
  process.exit(1);
}, 2000);
