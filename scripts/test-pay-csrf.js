// Simple Node script to test CSRF + /api/pay-now
// Usage: node scripts/test-pay-csrf.js

const url = 'http://localhost:5000';

async function run() {
  try {
    console.log('Fetching CSRF token...');
    const resp = await fetch(url + '/api/csrf-token');
    const setCookie = resp.headers.get('set-cookie') || resp.headers.get('Set-Cookie');
    const json = await resp.json().catch(() => null);
    const csrfToken = json && (json.csrfToken || json.token || json.csrf);
    console.log('CSRF token:', csrfToken ? 'OK' : 'MISSING');
    console.log('Set-Cookie header:', setCookie ? setCookie.split(';')[0] : 'none');

    const cookieHeader = setCookie ? setCookie.split(';')[0] : '';

    const body = {
      email: 'flow@test.com',
      name: 'Flow Test',
      phone: '+2348000000001',
      address: 'Test Location',
      items: [{ name: 'Ring', price: 5000, qty: 1, _id: '507f1f77bcf86cd799439011' }],
      amount: 5250
    };

    console.log('\nPosting to /api/pay-now with CSRF and cookie...');
    const payResp = await fetch(url + '/api/pay-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      },
      body: JSON.stringify(body)
    });

    const text = await payResp.text();
    console.log('Status:', payResp.status);
    try { console.log('Body:', JSON.parse(text)); } catch (e) { console.log('Body:', text); }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
