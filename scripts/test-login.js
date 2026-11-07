(async () => {
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin-389bc03d@example.com', password: 'hJstnVfND3kA', role: 'admin' })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test login error:', err);
  }
})();
