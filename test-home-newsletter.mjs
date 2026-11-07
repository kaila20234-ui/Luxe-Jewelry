import http from 'http';

function makeRequest(path, method, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payloadStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(payloadStr ? { 'Content-Length': Buffer.byteLength(payloadStr) } : {}),
        ...headers
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
    req.setTimeout(30000, () => req.destroy());
    if (payloadStr) req.write(payloadStr);
    req.end();
  });
}

(async () => {
  try {
    console.log('Testing HOME PAGE newsletter subscription...\n');
    
    // Step 1: Get CSRF token
    console.log('Step 1: Fetching CSRF token...');
    const csrfResult = await makeRequest('/api/csrf-token', 'GET');
    const csrfToken = csrfResult.data && (csrfResult.data.csrfToken || csrfResult.data.token || csrfResult.data.csrf);
    console.log('CSRF Token:', csrfToken ? '✓ Received' : '✗ Failed');
    
    // Test with the user's email
    const testEmail = 'hafizukaila81@gmail.com';
    
    console.log(`\nStep 2: Subscribing: ${testEmail}`);
    
    // Send subscription with CSRF token
    const result = await makeRequest('/api/newsletter/subscribe', 'POST', 
      { email: testEmail },
      csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
    );
    
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.success) {
      console.log('\n✓ Newsletter subscription SUCCESSFUL!');
      console.log('Check your email for the welcome message.');
    } else {
      console.log('\n✗ Newsletter subscription FAILED');
    }
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
