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
    const testEmails = [
      'luxejewelry04@gmail.com',  // The SMTP sender
      'sudaissalisuu@gmail.com',   // Another Gmail
      'hafizukaila81@gmail.com',   // Another subscriber
      'invalid@@@email.com',        // Invalid format (test)
      'abubakarabdullahibanye@gmail.com'  // Another subscriber
    ];
    
    console.log('=== NEWSLETTER MULTI-RECIPIENT TEST ===\n');
    console.log(`Testing ${testEmails.length} recipients...\n`);
    
    const result = await makeRequest('/api/newsletter/send', 'POST', {
      subject: 'Test Newsletter - Multiple Recipients',
      message: 'This is testing newsletter delivery to multiple Gmail addresses',
      recipients: testEmails,
      includeStoreInfo: true
    });
    
    console.log('Status:', result.status);
    console.log('\nResponse:');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.data.failedEmails) {
      console.log('\n⚠️  Failed emails:');
      result.data.failedEmails.forEach(email => console.log(`  - ${email}`));
    }
    
  } catch(err) {
    console.error('Error:', err.message);
    console.error('Full error:', err);
  }
  process.exit(0);
})();
