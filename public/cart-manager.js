/**
 * Cart Manager - Syncs local cart with backend database
 * Handles saving and loading cart items for authenticated users
 */

const CartManager = {
  LOCAL_STORAGE_KEY: 'CART_v1',
  API_URL: '/api/customer/cart',
  _lastAddTime: {}, // Track last add time for each product to prevent duplicates
  _addDebounceMs: 500, // Prevent same product being added twice within 500ms

  /**
   * Get auth token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.getAuthToken();
  },

  /**
   * Load cart from localStorage
   */
  loadLocalCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (e) {
      console.error('[CART-MGR] Error loading local cart:', e);
      return [];
    }
  },

  /**
   * Save cart to localStorage
   */
  saveLocalCart(cart) {
    try {
      console.log('[CART-MGR] saveLocalCart called with cart:', cart);
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(cart));
      console.log('[CART-MGR] Saved to localStorage:', cart.length, 'items');
      return true;
    } catch (e) {
      console.error('[CART-MGR] Error saving local cart:', e);
      return false;
    }
  },

  /**
   * Add item to cart (local + backend if logged in)
   * Includes debouncing to prevent duplicate adds
   */
  async addToCart(product, quantity = 1) {
    try {
      const productId = String(product._id || product.id);
      console.log('[CART-MGR] Adding to cart:', productId, 'Qty:', quantity);

      // Check if same product was just added (debounce)
      const now = Date.now();
      const lastAddTime = this._lastAddTime[productId] || 0;
      if (now - lastAddTime < this._addDebounceMs) {
        console.warn('[CART-MGR] Ignoring duplicate add request for product:', productId);
        return false;
      }
      
      // Update last add time
      this._lastAddTime[productId] = now;

      // Get current cart
      let cart = this.loadLocalCart();

      // Update local cart
      const existing = cart.find((i) => String(i._id) === String(productId));
      if (existing) {
        existing.qty += quantity;
      } else {
        cart.push({
          _id: product._id || product.id,
          id: product._id || product.id,
          name: product.name,
          price: product.price,
          qty: quantity,
          image: product.image,
          category: product.category || '',
        });
      }

      // Save to localStorage
      this.saveLocalCart(cart);

      // Dispatch cart updated event
      window.dispatchEvent(new Event('cartUpdated'));

      // Sync to backend if logged in
      if (this.isLoggedIn()) {
        await this.syncToBackend(product, quantity);
      } else {
        console.log('[CART-MGR] User not logged in, saving locally only');
      }

      return true;
    } catch (e) {
      console.error('[CART-MGR] Error adding to cart:', e);
      return false;
    }
  },

  /**
   * Sync single item to backend
   */
  async syncToBackend(product, quantity = 1) {
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.log('[CART-MGR] No auth token, skipping backend sync');
        return false;
      }

      console.log('[CART-MGR] Syncing to backend:', product._id);

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: product._id,
          name: product.name,
          price: product.price,
          image: product.image || '',
          category: product.category || '',
          qty: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[CART-MGR] Backend sync successful');
      // Dispatch event after backend sync completes
      window.dispatchEvent(new Event('cartUpdated'));
      return data;
    } catch (e) {
      console.error('[CART-MGR] Error syncing to backend:', e);
      return null;
    }
  },

  /**
   * Load cart from backend (for logged-in users)
   */
  async loadFromBackend() {
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.log('[CART-MGR] Not logged in, loading from localStorage');
        return this.loadLocalCart();
      }

      console.log('[CART-MGR] Loading cart from backend...');

      const response = await fetch(this.API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[CART-MGR] Failed to load from backend:', response.status);
        return this.loadLocalCart();
      }

      const data = await response.json();
      console.log('[CART-MGR] Raw backend response:', JSON.stringify(data, null, 2));
      const items = data.items || data.cart || data.data || [];

      console.log('[CART-MGR] Loaded from backend:', items.length, 'items');

      // Convert backend format to local format if needed
      const cart = items.map((i) => ({
        _id: i.id || i._id,
        id: i.id || i._id,
        name: i.name,
        price: i.price,
        qty: i.qty || 1,
        image: i.image,
        category: i.category || '',
      }));

      // Update localStorage with backend data
      this.saveLocalCart(cart);

      return cart;
    } catch (e) {
      console.error('[CART-MGR] Error loading from backend:', e);
      return this.loadLocalCart();
    }
  },

  /**
   * Update item quantity
   */
  async updateQuantity(productId, newQuantity) {
    try {
      if (newQuantity <= 0) {
        return this.removeItem(productId);
      }

      console.log('[CART-MGR] Updating quantity:', productId, 'to', newQuantity);

      // Update local cart
      let cart = this.loadLocalCart();
      const item = cart.find((i) => {
        const candidates = [];
        if (i._id) candidates.push(String(i._id));
        if (i.id) candidates.push(String(i.id));
        if (i.product && i.product._id) candidates.push(String(i.product._id));
        if (i.product && i.product.id) candidates.push(String(i.product.id));
        return candidates.some(c => c === String(productId));
      });
      if (!item) return false;

      item.qty = newQuantity;
      this.saveLocalCart(cart);
      window.dispatchEvent(new Event('cartUpdated'));

      // Sync to backend if logged in
      if (this.isLoggedIn()) {
        try {
          const token = this.getAuthToken();
          const response = await fetch(`${this.API_URL}/${productId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ qty: newQuantity }),
          });

          if (!response.ok) {
            if (response.status === 404) {
              console.warn('[CART-MGR] Backend update returned 404, treating as success because local cart was updated');
              return true;
            }
            throw new Error(`HTTP ${response.status}`);
          }

          console.log('[CART-MGR] Backend quantity updated');
        } catch (e) {
          console.error('[CART-MGR] Error syncing quantity update to backend:', e);
          return true;
        }
      }

      return true;
    } catch (e) {
      console.error('[CART-MGR] Error updating quantity:', e);
      return false;
    }
  },

  /**
   * Remove item from cart
   */
  async removeItem(productId) {
    try {
      console.log('[CART-MGR] Removing item:', productId);

      // Update local cart first
      let cart = this.loadLocalCart();
      const beforeLength = cart.length;

      // Robust local matching to remove item by id/_id/product.id/product._id
      const filtered = cart.filter((i) => {
        const candidates = [];
        if (i._id) candidates.push(String(i._id));
        if (i.id) candidates.push(String(i.id));
        if (i.product && i.product._id) candidates.push(String(i.product._id));
        if (i.product && i.product.id) candidates.push(String(i.product.id));
        // If any candidate equals the requested id, exclude the item
        return !candidates.some(c => c === String(productId));
      });

      // If nothing removed, attempt loose substring match to handle formatting differences
      let changed = filtered.length !== beforeLength;
      if (!changed) {
        const loose = cart.filter(i => {
          const s = JSON.stringify(i || {});
          return !(s && s.indexOf(String(productId)) !== -1);
        });
        changed = loose.length !== beforeLength;
        if (changed) {
          console.warn('[CART-MGR] Loose match removal applied for productId:', productId);
          cart = loose;
        } else {
          cart = filtered;
        }
      } else {
        cart = filtered;
      }
      this.saveLocalCart(cart);

      if (changed) {
        window.dispatchEvent(new Event('cartUpdated'));
      }

      // Sync to backend if logged in
      if (this.isLoggedIn()) {
        const token = this.getAuthToken();
        const response = await fetch(`${this.API_URL}/${productId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.warn('[CART-MGR] Backend delete returned 404, treating as success because local cart was updated');
            return true;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        console.log('[CART-MGR] Backend item removed');
      }

      return true;
    } catch (e) {
      console.error('[CART-MGR] Error removing item:', e);
      // If local cart was updated, still consider it a success to avoid blocking the UI.
      const cart = this.loadLocalCart();
      if (!cart.some((i) => String(i._id) === String(productId) || String(i.id || '') === String(productId))) {
        console.warn('[CART-MGR] Local cart no longer contains the item, returning success');
        return true;
      }
      return false;
    }
  },

  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      console.log('[CART-MGR] Clearing cart');

      // Clear localStorage
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);

      // Clear backend if logged in
      if (this.isLoggedIn()) {
        const token = this.getAuthToken();
        const response = await fetch(this.API_URL, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        console.log('[CART-MGR] Backend cart cleared');
      }

      return true;
    } catch (e) {
      console.error('[CART-MGR] Error clearing cart:', e);
      return false;
    }
  },

  /**
   * Sync all local cart items to backend (for login scenario)
   */
  async syncAllToBackend() {
    try {
      if (!this.isLoggedIn()) {
        console.log('[CART-MGR] Not logged in, cannot sync to backend');
        return false;
      }

      console.log('[CART-MGR] Syncing all items to backend...');

      const cart = this.loadLocalCart();
      let successCount = 0;

      for (const item of cart) {
        try {
          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.getAuthToken()}`,
            },
            body: JSON.stringify({
              id: item._id || item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              category: item.category || '',
              qty: item.qty || 1,
            }),
          });

          if (response.ok) {
            successCount++;
          }
        } catch (e) {
          console.error('[CART-MGR] Failed to sync item:', item._id, e);
        }
      }

      console.log('[CART-MGR] Synced', successCount, 'of', cart.length, 'items');
      return successCount === cart.length;
    } catch (e) {
      console.error('[CART-MGR] Error syncing all to backend:', e);
      return false;
    }
  },
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartManager;
}
