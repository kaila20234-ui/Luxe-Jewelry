const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(5001, 'localhost', () => {
  console.log('Test server running on port 5001');
});

setTimeout(() => {
  console.log('Shutting down test server...');
  process.exit(0);
}, 30000);
