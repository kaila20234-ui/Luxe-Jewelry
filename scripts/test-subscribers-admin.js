#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const adminEmail = 'admin-b24cb7e3@example.com';
const adminPass = 'hwHPcQpAE0sA';

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
    console.log('\n========== ADMIN SUBSCRIBERS TEST ==========\n');

    // Test 1: Admin Login
    console.log('📝 TEST 1: Admin Login');
    const loginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: adminEmail,
      password: adminPass,
    });
    console.log(`Status: ${loginRes.status}`);
    if (loginRes.status === 200) {
      console.log('✅ Login successful');
      console.log(`Token: ${loginRes.body.token?.substring(0, 20)}...`);
    } else {
      console.log('❌ Login failed:', loginRes.body);
      return;
    }
    const adminToken = loginRes.body.token;

    // Test 2: Get Subscribers
    console.log('\n📝 TEST 2: Fetch Subscribers');
    const subsRes = await makeRequest('GET', '/api/admin/subscribers', null, {
      'Authorization': `Bearer ${adminToken}`,
    });
    console.log(`Status: ${subsRes.status}`);
    if (subsRes.status === 200) {
      console.log('✅ Subscribers fetched successfully');
      console.log(`Newsletter subscribers: ${subsRes.body.newsletter.total}`);
      console.log(`Opted-in users: ${subsRes.body.users.total}`);
      console.log(JSON.stringify(subsRes.body, null, 2));
    } else {
      console.log('❌ Subscribers fetch failed:', subsRes.body);
    }

    console.log('\n========== TEST COMPLETE ==========\n');
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

runTests();
