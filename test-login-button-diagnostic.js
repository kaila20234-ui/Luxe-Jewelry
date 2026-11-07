// Comprehensive Customer Login Button Diagnostic Test
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test function
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'text/html'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runDiagnostics() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CUSTOMER LOGIN BUTTON DIAGNOSTIC TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // TEST 1: Check if index.html exists and loads
    console.log('[TEST 1] Loading index.html...');
    let response = await makeRequest('/index.html');
    let hasIndexPage = response.status === 200;
    console.log(`${hasIndexPage ? '✅' : '❌'} index.html loaded - Status: ${response.status}`);

    // TEST 2: Check if customer-login.html exists
    console.log('\n[TEST 2] Loading customer-login.html...');
    response = await makeRequest('/customer-login.html');
    let hasLoginPage = response.status === 200;
    console.log(`${hasLoginPage ? '✅' : '❌'} customer-login.html exists - Status: ${response.status}`);

    // TEST 3: Check if login button exists in index.html
    console.log('\n[TEST 3] Checking for login button in index.html...');
    response = await makeRequest('/index.html');
    const hasLoginBtn = response.data.includes('id="loginBtn"');
    console.log(`${hasLoginBtn ? '✅' : '❌'} Login button found (id="loginBtn")`);

    // TEST 4: Check if button has correct href
    console.log('\n[TEST 4] Checking login button href...');
    const hrefMatch = response.data.match(/id="loginBtn"[^>]*href="([^"]*)"/);
    if (hrefMatch) {
      const href = hrefMatch[1];
      const correctHref = href === '/customer-login.html';
      console.log(`${correctHref ? '✅' : '❌'} Button href: "${href}"`);
      if (!correctHref) {
        console.log(`   ⚠️  Expected: "/customer-login.html", Got: "${href}"`);
      }
    } else {
      console.log('❌ Could not find href in button');
    }

    // TEST 5: Check if button has event listener code
    console.log('\n[TEST 5] Checking for event listener...');
    const hasEventListener = response.data.includes('loginBtn.addEventListener');
    console.log(`${hasEventListener ? '✅' : '❌'} Event listener found in code`);

    // TEST 6: Check if loginBtn is referenced in JavaScript
    console.log('\n[TEST 6] Checking loginBtn references...');
    const loginBtnCount = (response.data.match(/loginBtn/g) || []).length;
    console.log(`✅ Found ${loginBtnCount} references to "loginBtn"`);
    if (loginBtnCount < 3) {
      console.log('   ⚠️  Warning: Fewer references than expected');
    }

    // TEST 7: Check CSS for login-btn class
    console.log('\n[TEST 7] Checking CSS styling...');
    const hasCss = response.data.includes('.login-btn');
    console.log(`${hasCss ? '✅' : '❌'} CSS class ".login-btn" found`);
    
    if (hasCss) {
      const cursorPointer = response.data.includes('.login-btn') && response.data.includes('cursor: pointer');
      console.log(`${cursorPointer ? '✅' : '⚠️'} Cursor pointer style applied`);
    }

    // TEST 8: Check FontAwesome icon
    console.log('\n[TEST 8] Checking FontAwesome icon...');
    const hasIcon = response.data.includes('fas fa-user');
    console.log(`${hasIcon ? '✅' : '❌'} FontAwesome user icon found`);

    // TEST 9: Check for auth-group container
    console.log('\n[TEST 9] Checking auth-group container...');
    const hasAuthGroup = response.data.includes('id="authGroup"');
    console.log(`${hasAuthGroup ? '✅' : '❌'} Auth group container found`);

    // TEST 10: Verify button text
    console.log('\n[TEST 10] Checking button text...');
    const buttonText = response.data.match(/loginBtn[^<]*>([^<]*Customer Login[^<]*)</i);
    if (buttonText) {
      console.log(`✅ Button text found: "${buttonText[1].trim()}"`);
    } else {
      console.log('⚠️  Could not find exact button text');
    }

    // SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(70));
    
    const allTests = [
      { name: 'index.html loads', pass: hasIndexPage },
      { name: 'customer-login.html exists', pass: hasLoginPage },
      { name: 'Login button exists', pass: hasLoginBtn },
      { name: 'Button href correct', pass: hrefMatch && hrefMatch[1] === '/customer-login.html' },
      { name: 'Event listener exists', pass: hasEventListener },
      { name: 'CSS styling present', pass: hasCss }
    ];

    const passed = allTests.filter(t => t.pass).length;
    const total = allTests.length;

    console.log(`\n✅ Passed: ${passed}/${total} (${Math.round((passed/total)*100)}%)\n`);

    if (passed === total) {
      console.log('🎉 ALL DIAGNOSTICS PASSED!');
      console.log('The customer login button should be fully functional.\n');
      console.log('If the button still doesn\'t work, the issue may be:');
      console.log('  • Browser cache - Try Ctrl+Shift+R to hard refresh');
      console.log('  • JavaScript disabled - Enable JavaScript in browser');
      console.log('  • Console errors - Check F12 Developer Tools > Console');
    } else {
      console.log('⚠️  Some issues detected. Review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic Error:', error.message);
    console.error('Make sure the server is running on port 5000');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Run diagnostics
runDiagnostics();
