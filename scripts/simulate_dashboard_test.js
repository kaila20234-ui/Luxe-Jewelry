(async () => {
  const fs = require('fs');
  const path = require('path');

  const BASE = 'http://localhost:5000';
  const loginBody = { email: 'testcustomer@example.com', password: 'custpass123' };

  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(loginBody)
    });
    if (!loginRes.ok) throw new Error('Login failed: ' + loginRes.status);
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login OK, token length:', token.length);

    // Prepare new profile values
    const testName = 'UI Test User ' + Date.now();
    const testPhone = '080' + Math.floor(Math.random() * 90000000 + 10000000);

    console.log('Patching profile with name:', testName, 'phone:', testPhone);
    const patchRes = await fetch(`${BASE}/api/customer/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: testName, phone: testPhone })
    });
    const patchData = await patchRes.json();
    console.log('PATCH status:', patchRes.status);
    if (!patchRes.ok) {
      console.error('PATCH failed:', patchData);
      process.exit(2);
    }

    // Fetch profile back
    const getRes = await fetch(`${BASE}/api/customer/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();
    console.log('GET status:', getRes.status);
    if (!getRes.ok) {
      console.error('GET failed:', getData);
      process.exit(3);
    }

    const profile = getData.user || getData;
    console.log('Profile returned:', JSON.stringify(profile, null, 2));

    // Simulate dashboard update: read HTML and replace inner text of profile spans
    const htmlPath = path.join(__dirname, '..', 'public', 'customer-dashboard.html');
    const outPath = path.join(__dirname, 'simulated_dashboard_result.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

      function replaceSpan(id, text) {
        // Match a <span ... id="id" ...>...</span> regardless of attribute order or spacing
        const re = new RegExp(`<span\\b[^>]*\\bid=["']${id}["'][^>]*>[\\s\\S]*?<\\/span>`, 'i');
        if (!re.test(html)) return false;
        html = html.replace(re, (m) => {
          // replace inner HTML between > and </span>
          return m.replace(/>([\s\S]*?)<\/span>/i, `>${text}</span>`);
        });
        return true;
      }

    const created = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '';
    const replacedName = replaceSpan('profileName', profile.name || '');
    const replacedEmail = replaceSpan('profileEmail', profile.email || '');
    const replacedPhone = replaceSpan('profilePhone', profile.phone || '');
    const replacedCreated = replaceSpan('profileCreatedAt', created);

    fs.writeFileSync(outPath, html, 'utf8');

    console.log('Simulation complete. Replacements:', {
      profileName: replacedName,
      profileEmail: replacedEmail,
      profilePhone: replacedPhone,
      profileCreatedAt: replacedCreated
    });
    console.log('Wrote simulated output to', outPath);
    console.log('\nSummary (values dashboard should show):');
    console.log('Name:', profile.name);
    console.log('Email:', profile.email);
    console.log('Phone:', profile.phone);
    console.log('Member Since:', created);

    process.exit(0);
  } catch (err) {
    console.error('Error during simulation:', err);
    process.exit(1);
  }
})();
