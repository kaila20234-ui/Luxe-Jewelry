#!/usr/bin/env node

/**
 * Security Verification Script
 * Tests all critical security implementations
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           SECURITY IMPLEMENTATION VERIFICATION                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// Test 1: Check compression is installed
console.log('🔍 [1/7] Checking compression package...');
try {
  require('compression');
  console.log('   ✅ compression package found\n');
  passed++;
} catch (e) {
  console.log('   ❌ compression package NOT installed\n');
  console.log('      Run: npm install compression\n');
  failed++;
}

// Test 2: Check helmet is installed
console.log('🔍 [2/7] Checking helmet package...');
try {
  require('helmet');
  console.log('   ✅ helmet package found\n');
  passed++;
} catch (e) {
  console.log('   ❌ helmet package NOT installed\n');
  console.log('      Run: npm install helmet\n');
  failed++;
}

// Test 3: Check server.js has JWT validation
console.log('🔍 [3/7] Checking JWT_SECRET validation in server.js...');
const serverContent = fs.readFileSync('./server.js', 'utf8');
if (serverContent.includes('!JWT_SECRET') && serverContent.includes('process.exit(1)')) {
  console.log('   ✅ JWT_SECRET validation found\n');
  passed++;
} else {
  console.log('   ❌ JWT_SECRET validation NOT found\n');
  failed++;
}

// Test 4: Check server.js has compression middleware
console.log('🔍 [4/7] Checking compression middleware...');
if (serverContent.includes("app.use(compression())")) {
  console.log('   ✅ Compression middleware enabled\n');
  passed++;
} else {
  console.log('   ❌ Compression middleware NOT found\n');
  failed++;
}

// Test 5: Check server.js has helmet middleware
console.log('🔍 [5/7] Checking helmet middleware...');
if (serverContent.includes("app.use(helmet())")) {
  console.log('   ✅ Helmet middleware enabled\n');
  passed++;
} else {
  console.log('   ❌ Helmet middleware NOT found\n');
  failed++;
}

// Test 6: Check server.js has payload limits
console.log('🔍 [6/7] Checking payload size limits...');
if (serverContent.includes("limit: '10mb'")) {
  console.log('   ✅ Payload size limits set to 10MB\n');
  passed++;
} else {
  console.log('   ❌ Payload size limits NOT found\n');
  failed++;
}

// Test 7: Check secured coupon routes
console.log('🔍 [7/7] Checking secured coupon routes...');
try {
  const couponContent = fs.readFileSync('./routes/coupons.js', 'utf8');
  if (couponContent.includes('authenticateJWT') && couponContent.includes('verifyAdminRole')) {
    console.log('   ✅ Coupon routes secured with JWT and admin role verification\n');
    passed++;
  } else {
    console.log('   ⚠️  Coupon routes may not be fully secured\n');
    failed++;
  }
} catch (e) {
  console.log('   ❌ Error reading coupon routes\n');
  failed++;
}

// Summary
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log(`║  RESULTS: ${passed} PASSED  |  ${failed} FAILED                          ║`);
console.log('╚════════════════════════════════════════════════════════════════╝\n');

if (failed === 0) {
  console.log('🎉 All security checks passed! Your system is ready.\n');
  console.log('📋 Next steps:');
  console.log('   1. Ensure JWT_SECRET is set in .env');
  console.log('   2. Ensure ADMIN_PASS_HASH is set in .env');
  console.log('   3. Run: npm run dev');
  console.log('   4. Monitor console for security validation logs\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Review the errors above.\n');
  process.exit(1);
}
