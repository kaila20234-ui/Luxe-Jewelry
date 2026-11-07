#!/usr/bin/env node
/**
 * Test script to verify the profile flow
 */

const axios = require('axios');

// Force IPv4 localhost
const BASE_URL = 'http://127.0.0.1:5000';
const TEST_EMAIL = `testuser${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123';
const TEST_NAME = 'Test User';
const TEST_PHONE = '+234 123 456 7890';

async function main() {
  try {
    console.log('\n=== PROFILE FLOW TEST ===\n');

    // Step 1: Register a test customer
    console.log('Step 1: Registering test customer...');
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Name: ${TEST_NAME}`);
    console.log(`  Phone: ${TEST_PHONE}\n`);

    const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      name: TEST_NAME,
      phone: TEST_PHONE
    });

    console.log('✓ Registration successful');
    console.log(`  UserId: ${registerRes.data.user._id}`);
    console.log(`  Token: ${registerRes.data.token.substring(0, 20)}...\n`);

    const userId = registerRes.data.user._id;
    let token = registerRes.data.token;

    // Step 2: Login with the same credentials
    console.log('Step 2: Logging in with credentials...');
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}\n`);

    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    console.log('✓ Login successful');
    console.log(`  UserId: ${loginRes.data.user._id}`);
    console.log(`  Token: ${loginRes.data.token.substring(0, 20)}...\n`);

    token = loginRes.data.token;

    // Step 3: Fetch profile using the token
    console.log('Step 3: Fetching profile with token...');
    console.log(`  Token: ${token.substring(0, 20)}...\n`);

    const profileRes = await axios.get(`${BASE_URL}/api/customer/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ Profile fetch successful');
    console.log(`  Response status: ${profileRes.status}`);
    console.log(`  Response data:`, JSON.stringify(profileRes.data, null, 2));

    if (profileRes.data.user) {
      const profile = profileRes.data.user;
      console.log('\n=== PROFILE DATA ===');
      console.log(`  ID: ${profile._id}`);
      console.log(`  Name: ${profile.name}`);
      console.log(`  Email: ${profile.email}`);
      console.log(`  Phone: ${profile.phone}`);
      console.log(`  Created At: ${profile.createdAt}`);
      console.log(`  Role: ${profile.role}`);
      console.log(`  All fields present: ${profile.name && profile.email && profile.phone ? 'YES' : 'NO'}`);
    }

    console.log('\n✓ Profile flow test PASSED\n');

  } catch (err) {
    console.error('\n✗ Test FAILED');
    console.error(`  Error: ${err.message}`);
    console.error(`  Full error:`, err);
    if (err.response) {
      console.error(`  Status: ${err.response.status}`);
      console.error(`  Data:`, err.response.data);
    }
    process.exit(1);
  }
}

main();
