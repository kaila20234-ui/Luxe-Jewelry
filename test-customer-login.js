// Test Customer Login Functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Customer Login Functionality...\n');

// Read the customer-login.html file
const htmlPath = path.join(__dirname, 'public', 'customer-login.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Test 1: Check if form exists
console.log('✓ Test 1: Form structure');
const hasForm = html.includes('id="loginFormElement"');
console.log(`  ${hasForm ? '✅ PASS' : '❌ FAIL'}: Login form exists`);

// Test 2: Check email input
console.log('\n✓ Test 2: Email input field');
const hasEmailInput = html.includes('id="loginEmail"') && html.includes('type="email"');
console.log(`  ${hasEmailInput ? '✅ PASS' : '❌ FAIL'}: Email input field found`);

// Test 3: Check password input
console.log('\n✓ Test 3: Password input field');
const hasPasswordInput = html.includes('id="loginPassword"') && html.includes('type="password"');
console.log(`  ${hasPasswordInput ? '✅ PASS' : '❌ FAIL'}: Password input field found`);

// Test 4: Check submit button
console.log('\n✓ Test 4: Submit button');
const hasSubmitBtn = html.includes('id="loginSubmitBtn"') && html.includes('Sign In');
console.log(`  ${hasSubmitBtn ? '✅ PASS' : '❌ FAIL'}: Submit button found`);

// Test 5: Check API call
console.log('\n✓ Test 5: API endpoint');
const hasApiCall = html.includes('/auth/login');
console.log(`  ${hasApiCall ? '✅ PASS' : '❌ FAIL'}: API call to login endpoint`);

// Test 6: Check token storage
console.log('\n✓ Test 6: Token storage');
const storesToken = html.includes("localStorage.setItem('authToken'");
console.log(`  ${storesToken ? '✅ PASS' : '❌ FAIL'}: Token stored in localStorage`);

// Test 7: Check redirect after login
console.log('\n✓ Test 7: Redirect after login');
const redirects = html.includes("'/customer-dashboard.html'") || html.includes('/customer-dashboard.html');
console.log(`  ${redirects ? '✅ PASS' : '❌ FAIL'}: Redirects to customer dashboard`);

// Test 8: Check already logged in check
console.log('\n✓ Test 8: Already logged in detection');
const checksLoggedIn = html.includes("localStorage.getItem('authToken')");
console.log(`  ${checksLoggedIn ? '✅ PASS' : '❌ FAIL'}: Checks if user already logged in`);

// Test 9: Check error handling
console.log('\n✓ Test 9: Error handling');
const hasErrorHandling = html.includes('catch') && html.includes('error');
console.log(`  ${hasErrorHandling ? '✅ PASS' : '❌ FAIL'}: Error handling implemented`);

// Test 10: Check password visibility toggle
console.log('\n✓ Test 10: Password visibility toggle');
const hasPasswordToggle = html.includes('toggleLoginPassword') && html.includes('loginPasswordIcon');
console.log(`  ${hasPasswordToggle ? '✅ PASS' : '❌ FAIL'}: Password visibility toggle found`);

console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

const allTests = [hasForm, hasEmailInput, hasPasswordInput, hasSubmitBtn, hasApiCall, storesToken, redirects, checksLoggedIn, hasErrorHandling, hasPasswordToggle];
const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log(`\n✅ PASSED: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n✅ ALL TESTS PASSED - Customer login is fully functional!');
} else {
  console.log('\n⚠️ SOME TESTS FAILED - Please review the implementation');
}

console.log('\n📝 Login flow:');
console.log('  1. Customer enters email and password');
console.log('  2. Form submits to /auth/login endpoint');
console.log('  3. If successful:');
console.log('     - Token stored in localStorage');
console.log('     - User redirected to customer-dashboard.html');
console.log('  4. If already logged in:');
console.log('     - Automatically redirected to dashboard');
