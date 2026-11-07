(function () {
  const sidebarItems = [
    { title: 'Dashboard', icon: 'fas fa-chart-line', href: '/admin.html', page: 'admin.html', section: 'dashboard' },
    { title: 'Products', icon: 'fas fa-box', href: '/admin.html#products', page: 'admin.html', section: 'products' },
    { title: 'Product List', icon: 'fas fa-list', href: '/admin.html#products', page: 'admin.html', section: 'products' },
    { title: 'Categories', icon: 'fas fa-folder', href: '/admin.html#categories', page: 'admin.html', section: 'categories' },
    { title: 'Users', icon: 'fas fa-users-cog', href: '/admin.html#users', page: 'admin.html', section: 'users' },
    { title: 'Customers', icon: 'fas fa-user-friends', href: '/admin.html#customers', page: 'admin.html', section: 'customers' },
    { title: 'Orders', icon: 'fas fa-box', href: '/admin.html#orders', page: 'admin.html', section: 'orders' },
    { title: 'Support Tickets', icon: 'fas fa-headset', href: '/admin.html#tickets', page: 'admin.html', section: 'tickets' },
    { title: 'Messages', icon: 'fas fa-envelope', href: '/admin.html#messages', page: 'admin.html', section: 'messages' },
    { title: 'Complaints', icon: 'fas fa-exclamation-circle', href: '/admin.html#complaints', page: 'admin.html', section: 'complaints' },
    { title: 'Top Customers', icon: 'fas fa-star', href: '/admin.html#top-customers', page: 'admin.html', section: 'top-customers' },
    { title: 'Status Level Settings', icon: 'fas fa-sliders-h', href: '/admin.html#status-levels', page: 'admin.html', section: 'status-levels' },
    { title: 'Sales Report', icon: 'fas fa-chart-bar', href: '/admin.html#sales', page: 'admin.html', section: 'sales' },
    { title: 'Address Cards', icon: 'fas fa-map-location-dot', href: '/admin.html#address-cards', page: 'admin.html', section: 'address-cards' },
    { title: 'Referrals', icon: 'fas fa-gift', href: '/admin.html#referrals', page: 'admin.html', section: 'referrals' },
    { title: 'Newsletter', icon: 'fas fa-envelope', href: '/admin.html#newsletter', page: 'admin.html', section: 'newsletter' },
    { title: 'Order Alerts', icon: 'fas fa-bell', href: '/admin.html#alerts', page: 'admin.html', section: 'alerts' },
    { title: 'Settings', icon: 'fas fa-cog', href: '/admin.html#settings', page: 'admin.html', section: 'settings' }
  ];

  function getSidebarHtml() {
    const sections = [
      {
        title: 'Main',
        items: sidebarItems.slice(0, 4)
      },
      {
        title: 'Management',
        items: sidebarItems.slice(4, 11)
      },
      {
        title: 'Admin',
        items: sidebarItems.slice(11, 15)
      },
      {
        title: 'Marketing',
        items: sidebarItems.slice(15, 16)
      },
      {
        title: 'System',
        items: sidebarItems.slice(16)
      }
    ];

    return sections
      .map(
        (section) => `
          <div class="menu-section">
            <div class="menu-section-title">${section.title}</div>
            ${section.items
              .filter((item) => !item.hidden)
              .map(
                (item) => `
                <a href="${item.href}" class="menu-item" data-page="${item.page}" data-section="${item.section || ''}">
                  <i class="${item.icon}"></i>
                  ${item.title}
                  ${item.page === 'referrals.html' ? '<span class="menu-badge" id="sidebar-referrals-badge" style="margin-left:8px;padding:2px 6px;border-radius:12px;background:#f2c94c;color:#111;font-weight:700;font-size:0.8rem"></span>' : ''}
                </a>
              `
              )
              .join('')}
          </div>
        `
      )
      .join('');
  }

  function buildShell() {
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <h2><i class="fas fa-gem"></i> Luxe Jewelry</h2>
        <p>Admin Panel</p>
      </div>
      <div class="sidebar-menu">
        ${getSidebarHtml()}
      </div>
      <div class="sidebar-footer" id="logoutBtn">
        <i class="fas fa-sign-out-alt"></i>
        <div class="sidebar-footer-text">
          <small>Ready to leave?</small>
          <p>Logout</p>
        </div>
      </div>
    `;
    return sidebar;
  }

  function setActiveMenuItem() {
    const currentPath = window.location.pathname || '/admin.html';
    const currentPage = (currentPath.split('/').pop() || 'admin.html').split('?')[0].split('#')[0];
    const currentHash = (window.location.hash || '').replace(/^#/, '');

    document.querySelectorAll('.sidebar-menu .menu-item').forEach((link) => {
      link.classList.remove('active');

      const section = link.dataset.section || '';
      if (currentPage === 'admin.html' && currentHash && section && section === currentHash) {
        link.classList.add('active');
        return;
      }

      const page = link.dataset.page || '';
      const hrefAttr = link.getAttribute('href') || '';
      const normalizedHref = hrefAttr.replace(/^\//, '').split('?')[0].split('#')[0];

      if (page && page === currentPage) {
        link.classList.add('active');
        return;
      }

      if (normalizedHref && (normalizedHref === currentPage || currentPath.endsWith(normalizedHref))) {
        link.classList.add('active');
        return;
      }
    });
  }

  function attachSidebarSectionHandlers() {
    document.querySelectorAll('.sidebar-menu .menu-item').forEach((link) => {
      link.addEventListener('click', (event) => {
        const section = link.dataset.section || '';
        const href = link.getAttribute('href') || '';

        if (window.location.pathname === '/admin.html' && section) {
          event.preventDefault();
          if (typeof window.switchSection === 'function') {
            window.switchSection(section);
          } else {
            window.setTimeout(() => window.switchSection(section), 50);
          }
          if (window.location.hash !== '#' + section) {
            history.replaceState(null, '', '#'+section);
          }
        }
      });
    });
  }

  function attachLogoutHandlers() {
    const logoutAction = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authRole');
      // Remove both legacy and new user keys to keep behaviour consistent
      localStorage.removeItem('authUser');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    };

    document.querySelectorAll('#logoutBtn, #logoutBtnHeader').forEach((el) => {
      el.addEventListener('click', logoutAction);
    });
  }

  function injectShell() {
    const body = document.body;
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    while (body.firstChild) {
      contentWrapper.appendChild(body.firstChild);
    }

    const contentArea = document.createElement('div');
    contentArea.className = 'content-area';
    contentArea.appendChild(contentWrapper);

    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    mainContent.appendChild(contentArea);

    const container = document.createElement('div');
    container.className = 'dashboard-container';
    container.appendChild(buildShell());
    container.appendChild(mainContent);

    body.appendChild(container);
  }

  window.adminShellReady = false;

  function initializeShell() {
    injectShell();
    setActiveMenuItem();
    attachSidebarSectionHandlers();
    attachLogoutHandlers();
    window.adminShellReady = true;
    Promise.resolve().then(() => document.dispatchEvent(new Event('adminShellReady')));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShell);
  } else {
    initializeShell();
  }

  // Attempt to update referrals badge if admin token present
  (function updateReferralsBadge(){
    try{
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      fetch('/api/admin/referrals/stats', { headers: { Authorization: 'Bearer ' + token } })
        .then(r=>r.json())
        .then(data=>{
          const el = document.getElementById('sidebar-referrals-badge');
          if (!el) return;
          if (data && (data.topReferrers || data.totalReferrers)){
            const count = (data.topReferrers && data.topReferrers.length) || data.totalReferrers || 0;
            el.textContent = count > 0 ? String(count) : '';
          }
        }).catch(()=>{/* ignore */});
    }catch(e){/* ignore */}
  })();
})();
