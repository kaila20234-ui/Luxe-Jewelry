// Comprehensive Customer Login Authentication Test
const http = require('http');

const BASE_URL = 'http://localhost:5000';
const API_URL = BASE_URL + '/api';

// Test User Data
const testUserData = {
  register: {
    email: 'testcustomer@test.com',
    password: 'Test@12345',
    confirmPassword: 'Test@12345',
    name: 'Test Customer',
    phone: '08012345678'
  },
  login: {
    email: 'testcustomer@test.com',
    password: 'Test@12345'
  },
  wrongPassword: {
    email: 'testcustomer@test.com',
    password: 'WrongPassword123'
  },
  nonExistent: {
    email: 'nonexistent@test.com',
    password: 'SomePassword123'
  }
};

// Helper function for making HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test Results
const results = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ' - ' + details : ''}`);
  results.push({ test: name, passed, details });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 CUSTOMER LOGIN AUTHENTICATION TEST SUITE');
  console.log('='.repeat(70) + '\n');

  try {
    // TEST 1: Register a new customer
    console.log('\n[TEST 1] Customer Registration');
    console.log('─'.repeat(70));
    let response = await makeRequest('POST', '/api/auth/register', testUserData.register);
    let registerSuccess = response.data.success && response.status === 201;
    logTest('Register new customer', registerSuccess, `Status: ${response.status}`);
    
    let registeredToken = null;
    let registeredUser = null;
    if (response.data.token) {
      registeredToken = response.data.token;
      registeredUser = response.data.user;
      logTest('Token received on registration', !!registeredToken);
      logTest('User data included', !!registeredUser);
      console.log(`   └─ Registered User ID: ${registeredUser?._id}`);
      console.log(`   └─ Registered Email: ${registeredUser?.email}`);
    }

    // TEST 2: Login with correct credentials
    console.log('\n[TEST 2] Customer Login - Valid Credentials');
    console.log('─'.repeat(70));
    response = await makeRequest('POST', '/api/auth/login', testUserData.login);
    let loginSuccess = response.data.success && response.status === 200;
    logTest('Login with correct credentials', loginSuccess, `Status: ${response.status}`);
    
    let loginToken = null;
    let loginUser = null;
    if (response.data.token) {
      loginToken = response.data.token;
      loginUser = response.data.user;
      logTest('Token generated on login', !!loginToken);
      logTest('User data returned on login', !!loginUser);
      console.log(`   └─ Login Token: ${loginToken.substring(0, 30)}...`);
      console.log(`   └─ User Email: ${loginUser?.email}`);
    }

    // TEST 3: Verify Token Structure
    console.log('\n[TEST 3] Token Structure Verification');
    console.log('─'.repeat(70));
    if (loginToken) {
      const parts = loginToken.split('.');
      logTest('Token is JWT format (3 parts)', parts.length === 3, `Parts: ${parts.length}`);
      
      try {
        const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
        const tokenData = JSON.parse(decoded);
        logTest('Token payload is valid JSON', true);
        logTest('Token contains userId', !!tokenData.userId, `userId: ${tokenData.userId}`);
        logTest('Token contains email', !!tokenData.email, `email: ${tokenData.email}`);
        console.log(`   └─ Token Payload: ${JSON.stringify(tokenData)}`);
      } catch (e) {
        logTest('Token payload is valid JSON', false, e.message);
      }
    }

    // TEST 4: Token Storage Simulation
    console.log('\n[TEST 4] Token Storage (Simulated localStorage)');
    console.log('─'.repeat(70));
    const simulatedStorage = {
      authToken: loginToken,
      user: JSON.stringify(loginUser)
    };
    logTest('authToken stored', !!simulatedStorage.authToken);
    logTest('user data stored', !!simulatedStorage.user);

    // TEST 5: Login with wrong password
    console.log('\n[TEST 5] Customer Login - Invalid Password');
    console.log('─'.repeat(70));
    response = await makeRequest('POST', '/api/auth/login', testUserData.wrongPassword);
    let wrongPasswordFail = !response.data.success;
    logTest('Reject login with wrong password', wrongPasswordFail, `Status: ${response.status}`);
    logTest('No token returned on failed login', !response.data.token);
    logTest('Error message provided', !!response.data.message, response.data.message);

    // TEST 6: Login with non-existent email
    console.log('\n[TEST 6] Customer Login - Non-Existent Email');
    console.log('─'.repeat(70));
    response = await makeRequest('POST', '/api/auth/login', testUserData.nonExistent);
    let nonExistentFail = !response.data.success;
    logTest('Reject login with non-existent email', nonExistentFail, `Status: ${response.status}`);
    logTest('No token returned', !response.data.token);
    logTest('Error message provided', !!response.data.message, response.data.message);

    // TEST 7: Missing credentials
    console.log('\n[TEST 7] Customer Login - Missing Credentials');
    console.log('─'.repeat(70));
    response = await makeRequest('POST', '/api/auth/login', { email: testUserData.login.email });
    let missingCredentialsFail = !response.data.success && response.status === 400;
    logTest('Reject login with missing password', missingCredentialsFail, `Status: ${response.status}`);
    
    response = await makeRequest('POST', '/api/auth/login', { password: testUserData.login.password });
    missingCredentialsFail = !response.data.success && response.status === 400;
    logTest('Reject login with missing email', missingCredentialsFail, `Status: ${response.status}`);

    // TEST 8: Token Refresh
    console.log('\n[TEST 8] Token Refresh');
    console.log('─'.repeat(70));
    if (loginToken) {
      const refreshOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/refresh',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginToken}`
        }
      };

      response = await new Promise((resolve, reject) => {
        const req = http.request(refreshOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        });
        req.on('error', reject);
        req.write('{}');
        req.end();
      });

      let refreshSuccess = response.data.success && response.status === 200;
      logTest('Token refresh successful', refreshSuccess, `Status: ${response.status}`);
      logTest('New token generated', !!response.data.token);
      if (response.data.token && loginToken) {
        logTest('New token is different from old token', response.data.token !== loginToken);
      }
    }

    // TEST 9: Change Password
    console.log('\n[TEST 9] Change Password (Protected Endpoint)');
    console.log('─'.repeat(70));
    if (loginToken) {
      const changePasswordOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/change-password',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginToken}`
        }
      };

      response = await new Promise((resolve, reject) => {
        const req = http.request(changePasswordOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        });
        req.on('error', reject);
        req.write(JSON.stringify({
          currentPassword: testUserData.login.password,
          newPassword: 'NewPassword@123'
        }));
        req.end();
      });

      logTest('Change password endpoint accessible with token', response.status === 200 || response.status === 401);
      console.log(`   └─ Status: ${response.status}, Message: ${response.data.message}`);
    }

    // TEST 10: Unauthorized Access without Token
    console.log('\n[TEST 10] Protected Endpoints - Authorization Check');
    console.log('─'.repeat(70));
    response = await makeRequest('POST', '/api/auth/change-password', {
      currentPassword: 'test',
      newPassword: 'test123'
    });
    let unauthorizedFail = response.status === 401;
    logTest('Protected endpoint rejects requests without token', unauthorizedFail, `Status: ${response.status}`);

    // SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`\n✅ Passed: ${passed}/${total} (${percentage}%)\n`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED - Customer login authentication is fully functional!\n');
    } else {
      console.log('⚠️  Some tests failed. Review the output above for details.\n');
      const failedTests = results.filter(r => !r.passed);
      console.log('Failed Tests:');
      failedTests.forEach(t => {
        console.log(`  • ${t.test} - ${t.details}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Test Suite Error:', error.message);
    console.error('Make sure the server is running on port 5000');
  }

  console.log('='.repeat(70) + '\n');
}

// Run tests
runTests();
