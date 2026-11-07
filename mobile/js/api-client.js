/* ============================================
   API CLIENT FOR MOBILE APP
   Handles all HTTP requests to backend
   ============================================ */

class APIClient {
  constructor(baseURL = null) {
    // Set base URL from config, environment, or default
    if (baseURL) {
      this.baseURL = baseURL;
    } else if (window.CONFIG && window.CONFIG.API_URL) {
      this.baseURL = window.CONFIG.API_URL;
    } else if (process.env.REACT_APP_API_URL) {
      this.baseURL = process.env.REACT_APP_API_URL;
    } else {
      // Auto-detect: use current host or fallback to localhost
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const port = window.location.port ? `:${window.location.port}` : '';
      const host = isProduction ? `${window.location.protocol}//${window.location.hostname}${port}` : 'http://localhost:5000';
      this.baseURL = `${host}/api`;
    }
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Build request headers
  getHeaders(isFormData = false) {
    const headers = {
      'Accept': 'application/json',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const config = {
      ...options,
      headers: { ...this.getHeaders(isFormData), ...options.headers },
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authRole');
        localStorage.removeItem('user');
        window.location.href = '/mobile/index.html';
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // GET request
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  // PATCH request
  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  // PUT request
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  // DELETE request
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async login(email, password, role = 'customer') {
    return this.post('/auth/login', { email, password, role });
  }

  async register(email, password, name) {
    return this.post('/auth/register', { email, password, name });
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  async refreshToken() {
    return this.post('/auth/refresh', {});
  }

  // ============================================
  // PRODUCT ENDPOINTS
  // ============================================

  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/products${query ? '?' + query : ''}`);
  }

  async getProduct(id) {
    return this.get(`/products/${id}`);
  }

  async searchProducts(query) {
    return this.get(`/search?q=${encodeURIComponent(query)}`);
  }

  async getCategories() {
    return this.get('/categories');
  }

  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================

  async getProfile() {
    return this.get('/customer/profile');
  }

  async updateProfile(data) {
    return this.patch('/customer/profile', data);
  }

  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/orders${query ? '?' + query : ''}`);
  }

  async getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  async getAddresses() {
    return this.get('/customer/addresses');
  }

  async addAddress(data) {
    return this.post('/customer/addresses', data);
  }

  async updateAddress(id, data) {
    return this.patch(`/customer/addresses/${id}`, data);
  }

  async deleteAddress(id) {
    return this.delete(`/customer/addresses/${id}`);
  }

  async getWishlist() {
    return this.get('/wishlist');
  }

  async addToWishlist(productId) {
    return this.post('/wishlist', { productId });
  }

  async removeFromWishlist(productId) {
    return this.delete(`/wishlist/${productId}`);
  }

  async getReviews(productId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reviews/${productId}${query ? '?' + query : ''}`);
  }

  async addReview(productId, data) {
    return this.post('/reviews', { productId, ...data });
  }

  async submitComplaint(data) {
    return this.post('/complaint', data);
  }

  // ============================================
  // CART & CHECKOUT
  // ============================================

  async getCart() {
    return this.get('/cart');
  }

  async addToCart(productId, quantity = 1) {
    return this.post('/cart', { productId, quantity });
  }

  async updateCart(items) {
    return this.put('/cart', { items });
  }

  async removeFromCart(productId) {
    return this.delete(`/cart/${productId}`);
  }

  async clearCart() {
    return this.delete('/cart');
  }

  async validateCoupon(code) {
    return this.post('/coupons/validate', { code });
  }

  async applyCoupon(code) {
    return this.post('/cart/coupon', { code });
  }

  async checkout(data) {
    return this.post('/checkout', data);
  }

  // ============================================
  // PAYMENT
  // ============================================

  async initiatePayment(data) {
    return this.post('/pay', data);
  }

  async verifyPayment(reference) {
    return this.get(`/payment/verify/${reference}`);
  }

  // ============================================
  // MANAGER ENDPOINTS
  // ============================================

  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/complaints${query ? '?' + query : ''}`);
  }

  async replyToComplaint(id, data) {
    return this.patch(`/complaints/${id}`, data);
  }

  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/tickets${query ? '?' + query : ''}`);
  }

  async replyToTicket(id, data) {
    return this.patch(`/tickets/${id}`, data);
  }

  async getSubscribers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/subscribers${query ? '?' + query : ''}`);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  async createProduct(data) {
    return this.post('/products', data);
  }

  async updateProduct(id, data) {
    return this.patch(`/products/${id}`, data);
  }

  async deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  async createCategory(data) {
    return this.post('/categories', data);
  }

  async updateCategory(id, data) {
    return this.patch(`/categories/${id}`, data);
  }

  async deleteCategory(id) {
    return this.delete(`/categories/${id}`);
  }

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/users${query ? '?' + query : ''}`);
  }

  async createUser(data) {
    return this.post('/admin/users', data);
  }

  async updateUser(id, data) {
    return this.patch(`/admin/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.delete(`/admin/users/${id}`);
  }

  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/customers${query ? '?' + query : ''}`);
  }

  async getSalesReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/admin/sales${query ? '?' + query : ''}`);
  }

  async getAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/analytics${query ? '?' + query : ''}`);
  }

  async getCoupons(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/coupons${query ? '?' + query : ''}`);
  }

  async createCoupon(data) {
    return this.post('/coupons', data);
  }

  async updateCoupon(id, data) {
    return this.patch(`/coupons/${id}`, data);
  }

  async deleteCoupon(id) {
    return this.delete(`/coupons/${id}`);
  }
}

// Create global API instance
// Auto-detects server URL from CONFIG, environment, or auto-detect (works on mobile devices)
const api = new APIClient();

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/mobile/js/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    // Listen for updates
    navigator.serviceWorker.addEventListener('controller', () => {
      console.log('Service Worker updated');
    });
  });

  // Handle update notification
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// ============================================
// OFFLINE DETECTION
// ============================================

window.addEventListener('online', () => {
  console.log('Connection restored');
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
  document.body.classList.add('offline');
});

// ============================================
// NETWORK STATUS
// ============================================

if (!navigator.onLine) {
  document.body.classList.add('offline');
}
