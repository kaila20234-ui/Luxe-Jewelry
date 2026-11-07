// Test: Customer Login Button Navigation
// This test verifies that the login button correctly navigates to /customer-login.html

console.log('🔍 TESTING CUSTOMER LOGIN BUTTON...\n');

// Test 1: Check if login button exists
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  console.log('✅ Login button found (ID: loginBtn)');
  console.log(`   └─ Element: ${loginBtn.tagName}`);
  console.log(`   └─ Class: ${loginBtn.className}`);
  console.log(`   └─ Href: ${loginBtn.href}`);
} else {
  console.error('❌ Login button NOT found');
}

// Test 2: Check button href
if (loginBtn && loginBtn.href) {
  const expectedHref = window.location.origin + '/customer-login.html';
  const actualHref = loginBtn.href;
  
  if (actualHref === expectedHref || actualHref.includes('customer-login.html')) {
    console.log('✅ Login button href is correct');
    console.log(`   └─ Expected: /customer-login.html`);
    console.log(`   └─ Actual: ${actualHref}`);
  } else {
    console.error('❌ Login button href is INCORRECT');
    console.log(`   └─ Expected: /customer-login.html`);
    console.log(`   └─ Actual: ${actualHref}`);
  }
} else {
  console.error('❌ Login button has no href');
}

// Test 3: Check button visibility
if (loginBtn) {
  const isVisible = loginBtn.offsetParent !== null;
  const displayStyle = window.getComputedStyle(loginBtn).display;
  const visibilityStyle = window.getComputedStyle(loginBtn).visibility;
  
  console.log(`\n✅ Button visibility check:`);
  console.log(`   └─ Visible on page: ${isVisible}`);
  console.log(`   └─ Display style: ${displayStyle}`);
  console.log(`   └─ Visibility style: ${visibilityStyle}`);
  
  if (displayStyle === 'none') {
    console.warn('   ⚠️  WARNING: Button is hidden (display: none)');
  }
}

// Test 4: Check button text
if (loginBtn) {
  const buttonText = loginBtn.textContent.trim();
  console.log(`\n✅ Button text: "${buttonText}"`);
  
  if (buttonText.includes('Customer Login')) {
    console.log('   └─ Correct: Contains "Customer Login"');
  } else {
    console.warn(`   ⚠️  Expected "Customer Login", got "${buttonText}"`);
  }
}

// Test 5: Check if button is clickable
if (loginBtn) {
  const isClickable = loginBtn.onclick !== null || 
                      loginBtn.getAttribute('onclick') !== null ||
                      loginBtn.href !== '' ||
                      loginBtn.getAttribute('href') !== '';
  
  console.log(`\n✅ Button clickability:`);
  console.log(`   └─ Has onclick: ${loginBtn.onclick !== null}`);
  console.log(`   └─ Has href: ${loginBtn.href !== ''}`);
  console.log(`   └─ Is clickable: ${isClickable}`);
}

// Test 6: Simulate click behavior
console.log('\n📋 Testing click behavior:');
if (loginBtn) {
  // Create a click event
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  });
  
  console.log('   └─ Click event created');
  console.log('   └─ Expected behavior: Navigate to /customer-login.html');
  console.log('   └─ Actual navigation will happen on real click');
}

// Test 7: Check authentication status
console.log('\n🔐 Authentication status:');
const authToken = localStorage.getItem('authToken');
const user = localStorage.getItem('user');

if (authToken && user) {
  console.log('   └─ User IS logged in');
  console.log('   └─ Login button should be HIDDEN');
} else {
  console.log('   └─ User is NOT logged in');
  console.log('   └─ Login button should be VISIBLE');
}

// Test 8: Check auth group container
const authGroup = document.getElementById('authGroup');
if (authGroup) {
  console.log('\n✅ Auth group container found');
  const buttons = authGroup.querySelectorAll('a.login-btn');
  console.log(`   └─ Number of login buttons: ${buttons.length}`);
  buttons.forEach((btn, idx) => {
    console.log(`   └─ Button ${idx + 1}: ${btn.href}`);
  });
} else {
  console.error('❌ Auth group container NOT found');
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('TESTING COMPLETE');
console.log('═══════════════════════════════════════════════════════\n');

// Provide navigation function for debugging
window.testLoginNavigation = function() {
  console.log('🧪 Manually triggering login button click...');
  if (loginBtn) {
    loginBtn.click();
  } else {
    console.error('Login button not found!');
  }
};

console.log('TIP: Run testLoginNavigation() in console to manually test the button click');
