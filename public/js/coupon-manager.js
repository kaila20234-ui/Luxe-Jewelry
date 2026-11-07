/**
 * Coupon Application Handler
 * Use this on checkout/cart page to apply discount codes
 */

class CouponManager {
  constructor(cartTotalElement, finalTotalElement, discountElement) {
    this.cartTotalElement = document.querySelector(cartTotalElement);
    this.finalTotalElement = document.querySelector(finalTotalElement);
    this.discountElement = document.querySelector(discountElement);
    this.appliedCoupon = null;
    this.discountAmount = 0;
  }

  /**
   * Initialize coupon form
   */
  init() {
    const form = document.querySelector('[data-coupon-form]');
    const input = document.querySelector('[data-coupon-input]');
    const button = document.querySelector('[data-coupon-apply]');
    const messageDiv = document.querySelector('[data-coupon-message]');

    if (!form || !input || !button || !messageDiv) {
      console.log('[coupon-manager] Coupon UI not found; skipping coupon manager initialization.');
      return;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input?.value?.trim();
      if (code) {
        this.applyCoupon(code, messageDiv, input);
      }
    });

    button.addEventListener('click', () => {
      const code = input?.value?.trim();
      if (code) {
        this.applyCoupon(code, messageDiv, input);
      }
    });
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(code, messageDiv, inputElement) {
    try {
      const cartTotal = this.getCartTotal();

      if (!cartTotal || cartTotal <= 0) {
        this.showMessage("Your cart is empty", messageDiv, false);
        return;
      }

      // Get cart items
      const items = this.getCartItems();

      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cartTotal,
          items,
          userId: this.getUserId(),
          userEmail: this.getUserEmail()
        })
      });

      const data = await response.json();

      if (data.success) {
        this.appliedCoupon = data.coupon;
        this.discountAmount = data.discount;
        this.updateDisplay(cartTotal);
        this.showMessage(data.message, messageDiv, true);
        if (inputElement) inputElement.disabled = true;
      } else {
        this.showMessage(data.message, messageDiv, false);
      }
    } catch (error) {
      console.error('Coupon error:', error);
      this.showMessage('Error applying coupon. Please try again.', messageDiv, false);
    }
  }

  /**
   * Remove applied coupon
   */
  removeCoupon() {
    this.appliedCoupon = null;
    this.discountAmount = 0;
    this.updateDisplay(this.getCartTotal());
  }

  /**
   * Update display with discount
   */
  updateDisplay(cartTotal) {
    if (this.discountElement) {
      this.discountElement.textContent = `₦${this.discountAmount.toFixed(2)}`;
    }

    if (this.finalTotalElement) {
      const finalTotal = cartTotal - this.discountAmount;
      this.finalTotalElement.textContent = `₦${Math.max(0, finalTotal).toFixed(2)}`;
    }
  }

  /**
   * Show message
   */
  showMessage(message, messageDiv, isSuccess) {
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = isSuccess ? 
      'rgba(76, 175, 80, 0.1)' : 'rgba(255, 99, 71, 0.1)';
    messageDiv.style.color = isSuccess ? '#4CAF50' : '#ff6347';
    messageDiv.style.padding = '12px';
    messageDiv.style.borderRadius = '6px';
    messageDiv.style.marginTop = '12px';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }

  /**
   * Get cart total from page
   */
  getCartTotal() {
    if (this.cartTotalElement) {
      const text = this.cartTotalElement.textContent;
      const match = text.match(/[\d,]+\.?\d*/);
      if (match) {
        return parseFloat(match[0].replace(/,/g, ''));
      }
    }
    return 0;
  }

  /**
   * Get cart items
   */
  getCartItems() {
    const items = [];
    const rows = document.querySelectorAll('[data-cart-item]');
    
    rows.forEach(row => {
      const productId = row.dataset.productId;
      const category = row.dataset.category;
      items.push({ productId, category });
    });

    if (items.length > 0) {
      return items;
    }

    const rawCart = sessionStorage.getItem('cartData') || sessionStorage.getItem('cart');
    if (!rawCart) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawCart);
      const sourceItems = parsed.items || parsed;
      return Array.isArray(sourceItems)
        ? sourceItems.map(item => ({
            productId: item.productId || item._id || item.id || null,
            category: item.category || item.type || null,
          }))
        : [];
    } catch (error) {
      console.warn('[coupon-manager] Failed to parse cart items from sessionStorage.', error);
      return [];
    }
  }

  /**
   * Get user ID if logged in
   */
  getUserId() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Get user email
   */
  getUserEmail() {
    const email = localStorage.getItem('user_email');
    return email || '';
  }

  /**
   * Get applied coupon details
   */
  getAppliedCoupon() {
    return {
      coupon: this.appliedCoupon,
      discount: this.discountAmount
    };
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const couponManager = new CouponManager(
      '[data-cart-total]',
      '[data-final-total]',
      '[data-discount-amount]'
    );
    couponManager.init();
    window.couponManager = couponManager;
  });
} else {
  const couponManager = new CouponManager(
    '[data-cart-total]',
    '[data-final-total]',
    '[data-discount-amount]'
  );
  couponManager.init();
  window.couponManager = couponManager;
}
