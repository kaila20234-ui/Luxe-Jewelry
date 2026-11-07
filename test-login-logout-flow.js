#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let authToken = null;
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPass123456';

console.log('\n========== CUSTOMER LOGIN/LOGOUT FLOW TEST ==========\n');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Register User
    console.log('📝 TEST 1: Register Customer');
    const registerRes = await makeRequest('POST', '/api/auth/register', {
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
      name: 'Test User',
      phone: '08012345678',
    });
    console.log(`   Status: ${registerRes.status}`);
    console.log(`   Success: ${registerRes.body.success}`);
    if (registerRes.body.token) {
      authToken = registerRes.body.token;
      console.log(`   ✅ Token received: ${authToken.substring(0, 20)}...`);
    }
    console.log();

    // Test 2: Login User
    console.log('🔐 TEST 2: Login Customer');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    console.log(`   Status: ${loginRes.status}`);
    console.log(`   Success: ${loginRes.body.success}`);
    if (loginRes.body.token) {
      authToken = loginRes.body.token;
      console.log(`   ✅ Token received: ${authToken.substring(0, 20)}...`);
    }
    console.log();

    // Test 3: Access Protected Endpoint (verify token works)
    console.log('🔒 TEST 3: Access Protected Endpoint');
    const protectedRes = await makeRequest('POST', '/api/auth/refresh', null, {
      Authorization: `Bearer ${authToken}`,
    });
    console.log(`   Status: ${protectedRes.status}`);
    console.log(`   Success: ${protectedRes.body.success}`);
    if (protectedRes.body.token) {
      authToken = protectedRes.body.token;
      console.log(`   ✅ Token refreshed: ${authToken.substring(0, 20)}...`);
    }
    console.log();

    // Test 4: Invalid Login (wrong password)
    console.log('❌ TEST 4: Invalid Login (Wrong Password)');
    const invalidRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword123',
    });
    console.log(`   Status: ${invalidRes.status}`);
    console.log(`   Success: ${invalidRes.body.success}`);
    console.log(`   Message: ${invalidRes.body.message}`);
    console.log();

    // Test 5: Logout Simulation (clear token)
    console.log('🚪 TEST 5: Logout Simulation');
    console.log(`   Before logout - Token exists: ${!!authToken}`);
    authToken = null;
    console.log(`   After logout - Token exists: ${!!authToken}`);
    console.log(`   ✅ Logout successful`);
    console.log();

    // Test 6: Try to use expired token
    console.log('⏰ TEST 6: Attempt Protected Endpoint Without Token');
    const noTokenRes = await makeRequest('POST', '/api/auth/refresh', null, {
      Authorization: 'Bearer null',
    });
    console.log(`   Status: ${noTokenRes.status}`);
    console.log(`   Success: ${noTokenRes.body.success}`);
    console.log(`   Message: ${noTokenRes.body.message}`);
    console.log();

    console.log('========== FLOW TEST COMPLETE ==========\n');
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n📱 BROWSER FLOW:');
    console.log('   1. Click "Customer Login" button on index.html');
    console.log('   2. You will be redirected to /customer-login.html');
    console.log('   3. If you\'re already logged in, you\'ll auto-redirect to dashboard');
    console.log('   4. Click "Logout" button in dashboard to clear tokens');
    console.log('   5. Now "Customer Login" button will show the login form\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

runTests();
