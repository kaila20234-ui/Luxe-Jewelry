/* ============================================
   LUXE JEWELRY MOBILE APP - MAIN LOGIC
   ============================================ */

const API_BASE_URL = 'http://localhost:3000/api';

// State Management
const AppState = {
  user: null,
  role: null,
  token: null,
  cart: [],
  products: [],
  orders: [],
  wishlist: [],
  isDarkMode: false,
  currentTab: null,
};

// Tab Configurations by Role
const TAB_CONFIG = {
  customer: [
    { id: 'home', label: 'Shop', icon: 'fa-home', page: 'customerHome' },
    { id: 'cart', label: 'Cart', icon: 'fa-shopping-cart', page: 'customerCart' },
    { id: 'orders', label: 'Orders', icon: 'fa-box', page: 'customerOrders' },
    { id: 'wishlist', label: 'Wishlist', icon: 'fa-heart', page: 'customerWishlist' },
    { id: 'profile', label: 'Profile', icon: 'fa-user', page: 'customerProfile' },
  ],
  manager: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', page: 'managerDashboard' },
    { id: 'complaints', label: 'Complaints', icon: 'fa-exclamation', page: 'managerComplaints' },
    { id: 'tickets', label: 'Tickets', icon: 'fa-ticket-alt', page: 'managerTickets' },
    { id: 'subscribers', label: 'Subscribers', icon: 'fa-envelope', page: 'managerSubscribers' },
    { id: 'profile', label: 'Profile', icon: 'fa-user', page: 'managerProfile' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', page: 'adminDashboard' },
    { id: 'products', label: 'Products', icon: 'fa-box', page: 'adminProducts' },
    { id: 'users', label: 'Staff', icon: 'fa-users', page: 'adminUsers' },
    { id: 'reports', label: 'Reports', icon: 'fa-file-chart-line', page: 'adminReports' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog', page: 'adminSettings' },
  ],
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Mobile App Loaded');
  
  // Load theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    toggleTheme();
  }

  // Check if user is already logged in
  const savedToken = localStorage.getItem('authToken');
  const savedRole = localStorage.getItem('authRole');
  const savedUser = localStorage.getItem('user');

  if (savedToken && savedRole && savedUser) {
    AppState.token = savedToken;
    AppState.role = savedRole;
    AppState.user = JSON.parse(savedUser);
    initializeApp();
  } else {
    showLoginPage();
  }

  // Event Listeners
  document.getElementById('searchToggle').addEventListener('click', toggleSearch);
  document.getElementById('cartToggle')?.addEventListener('click', navigateToPage('cart'));
  document.getElementById('profileToggle').addEventListener('click', openProfileMenu);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('searchInput')?.addEventListener('input', debounce(handleSearch, 300));
});

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const role = document.getElementById('loginRole').value;

  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Login failed. Please check your credentials.');
      return;
    }

    // Save authentication data
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authRole', role);
    localStorage.setItem('user', JSON.stringify(data.user || { email }));

    AppState.token = data.token;
    AppState.role = role;
    AppState.user = data.user || { email };

    // Clear form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';

    // Initialize app
    initializeApp();
  } catch (error) {
    console.error('Login error:', error);
    showError('Network error. Please try again.');
  }
}

async function handleRegister() {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const name = document.getElementById('regName').value.trim();

  if (!email || !password || !name) {
    showError('Please fill in all fields');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || 'Registration failed');
      return;
    }

    // Switch back to login
    switchToLogin();
    showSuccess('Account created! Please log in.');
  } catch (error) {
    console.error('Registration error:', error);
    showError('Network error. Please try again.');
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authRole');
    localStorage.removeItem('user');
    AppState.token = null;
    AppState.role = null;
    AppState.user = null;
    showLoginPage();
  }
}

// ============================================
// APP INITIALIZATION
// ============================================

function initializeApp() {
  console.log(`Initializing ${AppState.role} app`);

  // Hide login page
  document.getElementById('loginPage').classList.remove('active');

  // Show appropriate tabs
  renderTabNavigation();

  // Show cart button only for customers
  if (AppState.role === 'customer') {
    document.getElementById('cartToggle').style.display = 'block';
    loadProducts();
    loadCart();
    loadOrders();
    loadWishlist();
  }

  // Navigate to first tab
  const firstTab = TAB_CONFIG[AppState.role]?.[0];
  if (firstTab) {
    navigateToPage(firstTab.id)();
    updateProfileInfo();
  }
}

function renderTabNavigation() {
  const tabsContainer = document.getElementById('mobileTabs');
  tabsContainer.innerHTML = '';

  const tabs = TAB_CONFIG[AppState.role] || [];

  tabs.forEach((tab) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.id = `tab-${tab.id}`;
    tabButton.innerHTML = `
      <i class="fas ${tab.icon}"></i>
      <span>${tab.label}</span>
    `;
    tabButton.addEventListener('click', navigateToPage(tab.id));
    tabsContainer.appendChild(tabButton);
  });

  // Activate first tab
  const firstTab = tabs[0];
  if (firstTab) {
    activateTab(firstTab.id);
  }
}

// ============================================
// PAGE NAVIGATION
// ============================================

function navigateToPage(tabId) {
  return () => {
    const tab = TAB_CONFIG[AppState.role]?.find((t) => t.id === tabId);
    if (!tab) return;

    // Hide all pages
    document.querySelectorAll('.page-section').forEach((page) => {
      page.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(tab.page);
    if (pageElement) {
      pageElement.classList.add('active');
      AppState.currentTab = tabId;
      activateTab(tabId);

      // Load data for the page
      loadPageData(tab.page);
    }
  };
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
  });
  const button = document.getElementById(`tab-${tabId}`);
  if (button) {
    button.classList.add('active');
  }
}

function loadPageData(pageId) {
  // Load specific data based on page
  switch (pageId) {
    case 'customerHome':
      loadProducts();
      break;
    case 'customerCart':
      updateCartUI();
      break;
    case 'customerOrders':
      loadOrders();
      break;
    case 'customerWishlist':
      loadWishlist();
      break;
    case 'managerComplaints':
      loadComplaints();
      break;
    case 'managerTickets':
      loadTickets();
      break;
    case 'managerSubscribers':
      loadSubscribers();
      break;
    case 'adminProducts':
      loadAdminProducts();
      break;
    case 'adminUsers':
      loadAdminUsers();
      break;
  }
}

function showLoginPage() {
  document.querySelectorAll('.page-section').forEach((page) => {
    page.classList.remove('active');
  });
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('mobileTabs').style.display = 'none';
}

// ============================================
// CUSTOMER FUNCTIONS
// ============================================

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/products?limit=20`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load products');

    const data = await response.json();
    AppState.products = data.products || data;

    if (!AppState.products.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-box-open"></i>
          <p>No products available</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = AppState.products
      .map(
        (product) => `
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}">
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-price">₦${(product.price || 0).toLocaleString()}</p>
          <div class="product-footer">
            <button class="btn btn-primary" onclick="addToCart(event, '${product._id}', '${product.name}', ${product.price})" style="flex: 2; padding: 6px;">
              <i class="fas fa-cart-plus"></i>
            </button>
            <button class="btn-icon" onclick="addToWishlist('${product._id}')">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading products:', error);
    grid.innerHTML = '<div class="empty-state"><p>Failed to load products</p></div>';
  }
}

function addToCart(eventOrNull, productId, productName, price) {
  const existingItem = AppState.cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    AppState.cart.push({
      productId,
      name: productName,
      price,
      quantity: 1,
    });
  }

  localStorage.setItem('cart', JSON.stringify(AppState.cart));
  updateCartUI();
  updateCartCount();

  // Show feedback
  if (eventOrNull?.target) {
    const button = eventOrNull.target.closest('button');
    if (button) {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check"></i> Added!';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    }
  }
}

function removeFromCart(productId) {
  AppState.cart = AppState.cart.filter((item) => item.productId !== productId);
  localStorage.setItem('cart', JSON.stringify(AppState.cart));
  updateCartUI();
  updateCartCount();
}

function updateCartQuantity(productId, quantity) {
  const item = AppState.cart.find((item) => item.productId === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    localStorage.setItem('cart', JSON.stringify(AppState.cart));
    updateCartUI();
    updateCartCount();
  }
}

function updateCartUI() {
  const cartItemsContainer = document.getElementById('cartItems');
  const subtotal = AppState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  if (!AppState.cart.length) {
    cartItemsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
      </div>
    `;
    document.getElementById('cartSummary').style.display = 'none';
    return;
  }

  document.getElementById('cartSummary').style.display = 'block';
  cartItemsContainer.innerHTML = AppState.cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-image">
        <img src="https://via.placeholder.com/80" alt="${item.name}">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₦${(item.price || 0).toLocaleString()}</div>
        <div class="quantity-controls">
          <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">−</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          <button class="qty-btn" style="background: #f44336; color: white; margin-left: auto;" onclick="removeFromCart('${item.productId}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  document.getElementById('cartSubtotal').textContent = `₦${subtotal.toLocaleString()}`;
  document.getElementById('cartTotal').textContent = `₦${total.toLocaleString()}`;
}

function updateCartCount() {
  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const countBadge = document.getElementById('cartCount');
  if (countBadge) {
    countBadge.textContent = totalItems;
  }
}

function proceedToCheckout() {
  if (!AppState.cart.length) {
    showError('Cart is empty');
    return;
  }

  const total = AppState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.075;
  alert(`Proceeding to payment: ₦${total.toLocaleString()}\n\nThis would open Paystack payment gateway.`);
}

function addToWishlist(productId) {
  const exists = AppState.wishlist.find((item) => item.productId === productId);
  if (!exists) {
    const product = AppState.products.find((p) => p._id === productId);
    AppState.wishlist.push(product);
    localStorage.setItem('wishlist', JSON.stringify(AppState.wishlist));
    showSuccess('Added to wishlist');
  }
}

async function loadOrders() {
  const container = document.getElementById('ordersList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load orders');

    const data = await response.json();
    AppState.orders = data.orders || data || [];

    if (!AppState.orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-box"></i>
          <p>No orders yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = AppState.orders
      .map(
        (order) => `
      <div class="order-item">
        <div class="order-header">
          <span class="order-id">Order #${order._id?.slice(-8) || 'N/A'}</span>
          <span class="order-status">${order.status || 'Processing'}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin-bottom: 6px;">
          ${new Date(order.createdAt || Date.now()).toLocaleDateString()}
        </p>
        <div class="order-total">Total: ₦${(order.total || 0).toLocaleString()}</div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading orders:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load orders</p></div>';
  }
}

async function loadWishlist() {
  const grid = document.getElementById('wishlistItems');

  if (!AppState.wishlist.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-heart"></i>
        <p>Your wishlist is empty</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = AppState.wishlist
    .map(
      (product) => `
    <div class="product-card">
      <div class="product-image">
        <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}">
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">₦${(product.price || 0).toLocaleString()}</p>
        <div class="product-footer">
          <button class="btn btn-primary" onclick="addToCart(event, '${product._id}', '${product.name}', ${product.price})" style="flex: 1; padding: 6px;">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function updateProfileInfo() {
  if (AppState.role === 'customer') {
    document.getElementById('profileEmail').textContent = AppState.user?.email || 'N/A';
    document.getElementById('profileName').textContent = AppState.user?.name || 'Not set';
    document.getElementById('profilePhone').textContent = AppState.user?.phone || 'Not set';
  } else if (AppState.role === 'manager') {
    document.getElementById('managerEmail').textContent = AppState.user?.email || 'N/A';
  } else if (AppState.role === 'admin') {
    document.getElementById('adminEmail').textContent = AppState.user?.email || 'N/A';
  }
}

// ============================================
// MANAGER FUNCTIONS
// ============================================

async function loadComplaints() {
  const container = document.getElementById('complaintsList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/complaints`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load complaints');

    const data = await response.json();
    const complaints = data.complaints || data || [];

    if (!complaints.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No complaints</p>
        </div>
      `;
      return;
    }

    container.innerHTML = complaints
      .map(
        (complaint) => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${complaint.subject || 'Complaint'}</span>
          <span class="card-badge ${complaint.status || 'pending'}">${complaint.status || 'Pending'}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin-bottom: 8px;">From: ${complaint.customerEmail || 'Unknown'}</p>
        <p style="font-size: 13px; color: #555; margin-bottom: 12px;">${complaint.message || complaint.description || 'No description'}</p>
        <button class="btn btn-secondary" style="width: 100%; padding: 8px;">
          <i class="fas fa-reply"></i> Reply
        </button>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading complaints:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load complaints</p></div>';
  }
}

async function loadTickets() {
  const container = document.getElementById('ticketsList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load tickets');

    const data = await response.json();
    const tickets = data.tickets || data || [];

    if (!tickets.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <p>No support tickets</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tickets
      .map(
        (ticket) => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${ticket.subject || 'Support Ticket'}</span>
          <span class="card-badge ${ticket.status || 'open'}">${ticket.status || 'Open'}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin-bottom: 8px;">From: ${ticket.customerEmail || 'Unknown'}</p>
        <p style="font-size: 13px; color: #555; margin-bottom: 12px;">${ticket.message || 'No description'}</p>
        <button class="btn btn-secondary" style="width: 100%; padding: 8px;">
          <i class="fas fa-comment"></i> Respond
        </button>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading tickets:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load tickets</p></div>';
  }
}

async function loadSubscribers() {
  const container = document.getElementById('subscribersList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/subscribers`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load subscribers');

    const data = await response.json();
    const subscribers = data.subscribers || data || [];

    if (!subscribers.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-envelope"></i>
          <p>No subscribers</p>
        </div>
      `;
      return;
    }

    container.innerHTML = subscribers
      .map(
        (subscriber) => `
      <div class="list-item">
        <div class="list-item-icon">
          <i class="fas fa-envelope"></i>
        </div>
        <div class="list-item-content">
          <div class="list-item-title">${subscriber.email}</div>
          <div class="list-item-subtitle">Subscribed on ${new Date(subscriber.createdAt || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading subscribers:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load subscribers</p></div>';
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

async function loadAdminProducts() {
  const container = document.getElementById('adminProductsList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/products?limit=50`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load products');

    const data = await response.json();
    const products = data.products || data || [];

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-box"></i>
          <p>No products</p>
        </div>
      `;
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${product.name}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin-bottom: 6px;">Category: ${product.category || 'N/A'}</p>
        <p style="font-size: 13px; color: #d4af37; font-weight: 600; margin-bottom: 12px;">₦${(product.price || 0).toLocaleString()}</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="flex: 1; padding: 8px;">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger" style="flex: 1; padding: 8px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading products:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load products</p></div>';
  }
}

async function loadAdminUsers() {
  const container = document.getElementById('adminUsersList');
  container.innerHTML = '<div class="spinner" style="margin-top: 40px;"></div>';

  try {
    const response = await fetch(`${API_BASE_URL}/users?role=staff`, {
      headers: { Authorization: `Bearer ${AppState.token}` },
    });

    if (!response.ok) throw new Error('Failed to load users');

    const data = await response.json();
    const users = data.users || data || [];

    if (!users.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>No staff members</p>
        </div>
      `;
      return;
    }

    container.innerHTML = users
      .map(
        (user) => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${user.email}</span>
          <span class="card-badge">${user.role || 'Staff'}</span>
        </div>
        <p style="font-size: 12px; color: #999; margin-bottom: 12px;">Joined: ${new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="flex: 1; padding: 8px;">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger" style="flex: 1; padding: 8px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('Error loading users:', error);
    container.innerHTML = '<div class="empty-state"><p>Failed to load users</p></div>';
  }
}

// ============================================
// UI UTILITIES
// ============================================

function toggleSearch() {
  const searchBar = document.getElementById('searchBar');
  const isHidden = searchBar.style.display === 'none';
  searchBar.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    document.getElementById('searchInput').focus();
  }
}

function handleSearch(event) {
  const query = event.target.value.trim();
  if (!query) {
    loadProducts();
    return;
  }

  const filtered = AppState.products.filter(
    (p) => p.name.toLowerCase().includes(query.toLowerCase()) ||
           p.description?.toLowerCase().includes(query.toLowerCase())
  );

  const grid = document.getElementById('productsGrid');
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search"></i>
        <p>No products found</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (product) => `
    <div class="product-card">
      <div class="product-image">
        <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}">
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">₦${(product.price || 0).toLocaleString()}</p>
        <div class="product-footer">
          <button class="btn btn-primary" onclick="addToCart(event, '${product._id}', '${product.name}', ${product.price})" style="flex: 2; padding: 6px;">
            <i class="fas fa-cart-plus"></i>
          </button>
          <button class="btn-icon" onclick="addToWishlist('${product._id}')">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function toggleTheme() {
  AppState.isDarkMode = !AppState.isDarkMode;
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', AppState.isDarkMode ? 'dark' : 'light');
}

function openProfileMenu() {
  // Simple placeholder - can be enhanced with modal
  alert(`Logged in as: ${AppState.user?.email}\nRole: ${AppState.role}`);
}

function switchToLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('loginError').style.display = 'none';
}

function switchToRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function showError(message) {
  const errorDiv = document.getElementById('loginError');
  document.getElementById('errorMessage').textContent = message;
  errorDiv.style.display = 'flex';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  alert(message); // Simple alert - can be replaced with toast notification
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Load cart from localStorage on init
function loadCart() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    AppState.cart = JSON.parse(savedCart);
    updateCartCount();
  }
}
