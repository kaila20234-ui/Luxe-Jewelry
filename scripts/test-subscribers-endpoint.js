const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/subscribers',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluLWIyNGNiN2UzQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzMzNjgzNDUyfQ.kqyBJk7gN0PL5JxXbZq8vZ9lR3mN8oP2qR7sT9uV6wI'
  }
};

console.log('Testing /api/admin/subscribers endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\nResponse:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('\nRaw response:', data);
    }
  });
});

req.on('error', err => console.error('Error:', err));
req.end();
