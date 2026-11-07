(async function(){
  const apiBase = '/api/admin/referrals';

  function getToken() {
    return localStorage.getItem('adminToken') || document.getElementById('adminTokenInput').value.trim();
  }

  function authHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  async function fetchJSON(url, opts = {}) {
    try {
      const res = await fetch(url, Object.assign({ 
        headers: authHeaders() 
      }, opts));
      const text = await res.text();
      try { 
        const json = JSON.parse(text);
        json._status = res.status;
        json._ok = res.ok;
        return json;
      } catch(e) { 
        return { ok: res.ok, status: res.status, text, _status: res.status, _ok: res.ok };
      }
    } catch (err) {
      return { error: err.message, _status: 0, _ok: false };
    }
  }

  async function loadStats() {
    const token = getToken();
    if (!token) {
      document.getElementById('statsContent').innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i> Please save an admin token first.</div>';
      document.getElementById('topReferrers').innerHTML = '<div class="error">Token required</div>';
      return;
    }

    document.getElementById('statsContent').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    document.getElementById('topReferrers').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const data = await fetchJSON(apiBase + '/stats');
    
    if (!data._ok || !data.success) {
      const msg = data.message || data.text || 'Unknown error';
      document.getElementById('statsContent').innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ' + msg + '</div>';
      document.getElementById('topReferrers').innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Error: ' + msg + '</div>';
      return;
    }

    // Render stats
    const s = data;
    document.getElementById('statsContent').innerHTML = `
      <div class="stat-row">
        <div class="stat-item">
          <strong>${s.totalUsers || 0}</strong>
          <small>Total Users</small>
        </div>
        <div class="stat-item">
          <strong>${s.totalReferrers || 0}</strong>
          <small>Active Referrers</small>
        </div>
        <div class="stat-item">
          <strong>${s.totalReferrals || 0}</strong>
          <small>Total Referrals</small>
        </div>
      </div>
      <div style="background:#f9f6f1; padding:15px; border-radius:8px; margin-top:10px;">
        <h4 style="margin-bottom:10px;">Current Settings</h4>
        <pre style="white-space:pre-wrap; font-size:12px; color:#666;">${JSON.stringify(s.settings, null, 2)}</pre>
      </div>
    `;
    renderTopReferrers(s.topReferrers || []);
  }

  function renderTopReferrers(list) {
    const el = document.getElementById('topReferrers');
    if (!list || list.length === 0) { 
      el.innerHTML = '<div class="info"><i class="fas fa-info-circle"></i> No referrers yet.</div>'; 
      return; 
    }
    const rows = list.map(u => `
      <tr>
        <td>${u.name || 'N/A'}</td>
        <td>${u.email || 'N/A'}</td>
        <td><code>${u.referralCode || 'N/A'}</code></td>
        <td><strong>${u.referralCount || 0}</strong></td>
        <td><strong>₦${(u.storeCredit || 0).toLocaleString()}</strong></td>
      </tr>
    `).join('');
    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Referral Code</th>
            <th>Referrals Count</th>
            <th>Store Credit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  document.getElementById('saveTokenBtn').addEventListener('click', () => {
    const v = document.getElementById('adminTokenInput').value.trim();
    if (!v) {
      alert('❌ Please paste a token first');
      return;
    }
    localStorage.setItem('adminToken', v);
    alert('✅ Token saved to browser storage');
    loadStats();
  });

  document.getElementById('clearTokenBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    document.getElementById('adminTokenInput').value = '';
    alert('✅ Token cleared');
  });

  document.getElementById('refreshBtn').addEventListener('click', loadStats);

  // Settings form
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('❌ Please save an admin token first');
      return;
    }
    const form = e.target;
    const body = {};
    new FormData(form).forEach((v, k) => {
      if (v !== '') body[k] = Number(v);
    });
    const res = await fetchJSON(apiBase + '/settings', { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
    const result = document.getElementById('settingsResult');
    if (!res._ok || !res.success) {
      result.innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Failed: ' + (res.message || 'Unknown error') + '</div>';
      return;
    }
    result.innerHTML = '<div class="success"><i class="fas fa-check-circle"></i> Settings updated successfully!</div>';
    setTimeout(() => { result.innerHTML = ''; loadStats(); }, 2000);
  });

  // Award form
  document.getElementById('awardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      alert('❌ Please save an admin token first');
      return;
    }
    const form = e.target;
    const data = {};
    new FormData(form).forEach((v, k) => {
      data[k] = v;
    });
    data.amount = Number(data.amount || 0);
    if (!data.userId) {
      alert('❌ Please enter a User ID');
      return;
    }
    if (data.amount <= 0) {
      alert('❌ Please enter an amount greater than 0');
      return;
    }
    const res = await fetchJSON(apiBase + '/award', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
    const out = document.getElementById('awardResult');
    if (!res._ok || !res.success) {
      out.innerHTML = '<div class="error"><i class="fas fa-exclamation-circle"></i> Failed: ' + (res.message || 'Unknown error') + '</div>';
      return;
    }
    out.innerHTML = '<div class="success"><i class="fas fa-check-circle"></i> ✅ Award applied! New credit: ₦' + (res.user ? (res.user.storeCredit || 0).toLocaleString() : 'n/a') + '</div>';
    setTimeout(() => { out.innerHTML = ''; form.reset(); loadStats(); }, 3000);
  });

  window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('adminToken');
      location.href = '/staff-login.html';
    }
  };

  // Initial load
  try { await loadStats(); } catch(e) { console.error('Init loadStats failed', e); }
})();
