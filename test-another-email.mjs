import http from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const adminToken = jwt.sign(
  { userId: '12345', email: 'admin@test.com', role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const payloadStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        'Authorization': `Bearer ${adminToken}`
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy());
    req.write(payloadStr);
    req.end();
  });
}

(async () => {
  try {
    console.log('Testing newsletter send to: sudaissalisuu@gmail.com\n');
    const result = await makeRequest('/api/newsletter/send', 'POST', {
      subject: 'Test Newsletter to Another Email',
      message: 'This is a test newsletter to validate sending to other Gmail addresses',
      recipients: ['sudaissalisuu@gmail.com']
    });
    
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.data.success) {
      console.log('\n✓ Newsletter sent successfully!');
      console.log(`Sent: ${result.data.sentCount}, Failed: ${result.data.failedCount}`);
    } else {
      console.log('\n✗ Newsletter send failed');
    }
  } catch(err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
