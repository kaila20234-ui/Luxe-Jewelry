const http = require("http");

const options = {
  host: "localhost",
  port: 5000,
  path: "/test",
  method: "GET",
};

const req = http.request(options, (res) => {
  console.log(`✓ Connection successful! Status: ${res.statusCode}`);
  process.exit(0);
});

req.on("error", (err) => {
  console.error(`✗ Request failed:`, err.code);
  process.exit(1);
});

req.setTimeout(2000, () => {
  console.error("✗ Request timeout");
  process.exit(1);
});

req.end();
