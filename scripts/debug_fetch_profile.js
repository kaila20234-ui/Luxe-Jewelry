(async ()=>{
  const BASE = 'http://localhost:5000';
  const rnd = Date.now();
  const email = `tmp-debug-${rnd}@example.com`;
  const password = 'DebugPass123!';
  const fetch = globalThis.fetch || (await import('node-fetch')).default;

  console.log('Registering:', email);
  let res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password, confirmPassword: password, name: 'Dbg', phone: '0800'})
  });
  console.log('Register status', res.status);
  let body = await res.text();
  try { console.log('Register body', JSON.parse(body)); } catch(e){ console.log('Register raw', body); }

  console.log('Logging in...');
  res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password})
  });
  console.log('Login status', res.status);
  body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); console.log('Login body', parsed); } catch(e){ console.log('Login raw', body); }
  const token = parsed && parsed.token ? parsed.token : null;
  if (!token) {
    console.error('No token returned; aborting');
    process.exit(1);
  }

  console.log('Fetching /api/customer/profile with token...');
  res = await fetch(`${BASE}/api/customer/profile`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  console.log('Profile status', res.status);
  body = await res.text();
  try { console.log('Profile body', JSON.parse(body)); } catch(e){ console.log('Profile raw', body); }

  process.exit(0);
})();