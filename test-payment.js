const http = require('http');

async function test() {
  console.log('Testing payment flow...\n');

  // Test 1: Create session
  console.log('1. Creating payment session...');
  const sessionBody = JSON.stringify({
    email: 'flow@test.com',
    name: 'Flow Test',
    phone: '+2348000000001',
    address: 'Test Location',
    items: [{ name: 'Ring', price: 5000, qty: 1, _id: '507f1f77bcf86cd799439011' }],
    amount: 5250
  });

  const sessionRes = await post('http://localhost:5000/api/pay-now', sessionBody);
  console.log('Session response:', sessionRes.status);
  const sessionData = JSON.parse(sessionRes.body);
  if (sessionData.success) {
    console.log('✓ SessionID:', sessionData.sessionId);
  } else {
    console.log('✗ Error:', sessionData.message);
    return;
  }

  // Test 2: Initialize payment
  console.log('\n2. Initializing payment...');
  const payBody = JSON.stringify({ sessionId: sessionData.sessionId });
  const payRes = await post('http://localhost:5000/api/pay', payBody);
  console.log('Payment response:', payRes.status);
  const payData = JSON.parse(payRes.body);
  if (payData.status) {
    console.log('✓ Reference:', payData.reference);
    console.log('✓ URL:', payData.url.substring(0, 50) + '...');

    // Test 3: Verify payment
    console.log('\n3. Verifying payment...');
    const verifyRes = await get('http://localhost:5000/api/verify-payment?reference=' + encodeURIComponent(payData.reference));
    console.log('Verify response:', verifyRes.status);
    const verifyData = JSON.parse(verifyRes.body);
    if (verifyData.success) {
      console.log('✓ Order found!');
      console.log('  Email:', verifyData.sale.email);
      console.log('  Amount:', verifyData.sale.amount);
      console.log('  Items:', verifyData.sale.items.length);
    } else {
      console.log('✗ Order not found:', verifyData.message);
    }
  } else {
    console.log('✗ Error:', payData.message);
  }
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

test().catch(console.error);
