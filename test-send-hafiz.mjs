import http from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const adminToken = jwt.sign(
  { userId: 'admin', email: 'admin@local', role: 'admin' },
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
        Authorization: `Bearer ${adminToken}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
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
    console.log('Sending test newsletter to hafizukaila81@gmail.com...');
    const res = await makeRequest('/api/newsletter/send', 'POST', {
      subject: 'Test Newsletter to Hafiz',
      message: 'This is a test newsletter sent to verify delivery to Hafiz.',
      recipients: ['hafizukaila81@gmail.com'],
      includeStoreInfo: false
    });

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Request error:', err.message);
  }
  process.exit(0);
})();