const http = require('node:http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/products',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response status:', res.statusCode);
      console.log('Response headers:', res.headers);
      console.log('Response body:', JSON.stringify(json, null, 2));
      
      if (json.products) {
        console.log(`\n✓ Found ${json.products.length} products`);
      } else {
        console.log('\n✗ No "products" property in response');
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();
