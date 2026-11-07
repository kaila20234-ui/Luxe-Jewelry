/**
 * Cookie Consent Banner
 * Manages cookie consent and preference storage
 */

class CookieConsentManager {
  constructor() {
    this.consentKey = 'luxe_jewelry_cookie_consent';
    this.preferencesKey = 'luxe_jewelry_cookie_preferences';
    this.init();
  }

  /**
   * Initialize consent manager
   */
  init() {
    if (!this.hasConsent()) {
      this.showBanner();
    } else {
      this.loadPreferences();
    }
  }

  /**
   * Check if user has already given consent
   */
  hasConsent() {
    return localStorage.getItem(this.consentKey) !== null;
  }

  /**
   * Get user preferences
   */
  getPreferences() {
    const stored = localStorage.getItem(this.preferencesKey);
    return stored ? JSON.parse(stored) : this.getDefaultPreferences();
  }

  /**
   * Get default preferences (all essential, others off)
   */
  getDefaultPreferences() {
    return {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Show consent banner
   */
  showBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-banner-content">
        <div class="cookie-banner-text">
          <h3><i class="fas fa-cookie"></i> Cookie Settings</h3>
          <p>We use cookies to enhance your experience, analyze site traffic, and deliver personalized content. By clicking "Accept," you consent to our use of cookies. You can manage your preferences below.</p>
        </div>
        
        <div class="cookie-banner-preferences">
          <label class="cookie-checkbox">
            <input type="checkbox" id="cookie-essential" checked disabled>
            <span class="checkbox-custom"></span>
            <div class="checkbox-label">
              <strong>Essential Cookies</strong>
              <small>Required for site functionality</small>
            </div>
          </label>
          
          <label class="cookie-checkbox">
            <input type="checkbox" id="cookie-analytics">
            <span class="checkbox-custom"></span>
            <div class="checkbox-label">
              <strong>Analytics</strong>
              <small>Help us understand how you use our site</small>
            </div>
          </label>
          
          <label class="cookie-checkbox">
            <input type="checkbox" id="cookie-marketing">
            <span class="checkbox-custom"></span>
            <div class="checkbox-label">
              <strong>Marketing</strong>
              <small>Personalized ads and promotions</small>
            </div>
          </label>
          
          <label class="cookie-checkbox">
            <input type="checkbox" id="cookie-preferences">
            <span class="checkbox-custom"></span>
            <div class="checkbox-label">
              <strong>Preferences</strong>
              <small>Remember your choices and settings</small>
            </div>
          </label>
        </div>

        <div class="cookie-banner-actions">
          <button id="cookie-accept-all" class="btn-accept-all">
            <i class="fas fa-check"></i> Accept All
          </button>
          <button id="cookie-accept-essential" class="btn-accept-essential">
            <i class="fas fa-shield-alt"></i> Essential Only
          </button>
          <button id="cookie-save-preferences" class="btn-save-preferences">
            <i class="fas fa-save"></i> Save Preferences
          </button>
          <a href="/cookies.html" class="btn-learn-more">
            <i class="fas fa-info-circle"></i> Learn More
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Add CSS styles
    this.injectStyles();

    // Attach event listeners
    document.getElementById('cookie-accept-all').addEventListener('click', () => this.acceptAll());
    document.getElementById('cookie-accept-essential').addEventListener('click', () => this.acceptEssential());
    document.getElementById('cookie-save-preferences').addEventListener('click', () => this.savePreferences());
  }

  /**
   * Accept all cookies
   */
  acceptAll() {
    const prefs = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString()
    };
    this.saveConsent(prefs);
    this.loadScripts(prefs);
  }

  /**
   * Accept only essential cookies
   */
  acceptEssential() {
    const prefs = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    };
    this.saveConsent(prefs);
    this.loadScripts(prefs);
  }

  /**
   * Save user preferences
   */
  savePreferences() {
    const prefs = {
      essential: document.getElementById('cookie-essential').checked,
      analytics: document.getElementById('cookie-analytics').checked,
      marketing: document.getElementById('cookie-marketing').checked,
      preferences: document.getElementById('cookie-preferences').checked,
      timestamp: new Date().toISOString()
    };

    if (!prefs.essential) {
      alert('Essential cookies cannot be disabled as they are required for the website to function.');
      return;
    }

    this.saveConsent(prefs);
    this.loadScripts(prefs);
  }

  /**
   * Save consent and preferences to localStorage
   */
  saveConsent(preferences) {
    localStorage.setItem(this.consentKey, 'true');
    localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
    
    // Hide banner
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => banner.remove(), 300);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: preferences }));
  }

  /**
   * Load preferences and initialize tracking scripts
   */
  loadPreferences() {
    const prefs = this.getPreferences();
    this.loadScripts(prefs);
  }

  /**
   * Load tracking scripts based on preferences
   */
  loadScripts(preferences) {
    if (preferences.analytics) {
      this.loadGoogleAnalytics();
    }

    if (preferences.marketing) {
      this.loadFacebookPixel();
    }

    // Always load essential scripts (they're built into the site)
    if (preferences.preferences) {
      this.initializePreferenceTracking();
    }
  }

  /**
   * Load Google Analytics
   */
  loadGoogleAnalytics() {
    // Only load if not already loaded
    if (window.gtag) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  }

  /**
   * Load Facebook Pixel
   */
  loadFacebookPixel() {
    if (window.fbq) return;

    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', 'FACEBOOK_PIXEL_ID');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
  }

  /**
   * Initialize preference tracking (for theme, language, etc.)
   */
  initializePreferenceTracking() {
    // Example: track theme preference changes
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      localStorage.setItem('luxe_preferred_theme', currentTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  /**
   * Inject CSS styles for cookie banner
   */
  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }

      #cookie-consent-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-top: 3px solid #d4af37;
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: slideIn 0.4s ease-out forwards;
      }

      .cookie-banner-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 24px;
        align-items: start;
      }

      .cookie-banner-text h3 {
        margin: 0 0 8px 0;
        color: #d4af37;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cookie-banner-text p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .cookie-banner-preferences {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .cookie-checkbox {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .cookie-checkbox:hover {
        background: #f9f6f1;
      }

      .cookie-checkbox input {
        width: 0;
        height: 0;
        opacity: 0;
        cursor: pointer;
      }

      .checkbox-custom {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border: 2px solid #d4af37;
        border-radius: 4px;
        background: white;
        transition: all 0.2s;
        margin-top: 2px;
      }

      .cookie-checkbox input:checked + .checkbox-custom {
        background: #d4af37;
        border-color: #d4af37;
      }

      .cookie-checkbox input:checked + .checkbox-custom::after {
        content: '✓';
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      .checkbox-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .checkbox-label strong {
        color: #333;
        font-size: 0.9rem;
      }

      .checkbox-label small {
        color: #999;
        font-size: 0.8rem;
      }

      .cookie-banner-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .cookie-banner-actions button,
      .cookie-banner-actions a {
        padding: 10px 16px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-accept-all {
        background: linear-gradient(135deg, #d4af37, #b6912e);
        color: white;
      }

      .btn-accept-all:hover {
        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      }

      .btn-accept-essential {
        background: #f9f6f1;
        color: #333;
        border: 1px solid #d4af37;
      }

      .btn-accept-essential:hover {
        background: #f0e8d8;
      }

      .btn-save-preferences {
        background: white;
        color: #d4af37;
        border: 2px solid #d4af37;
      }

      .btn-save-preferences:hover {
        background: #f9f6f1;
      }

      .btn-learn-more {
        color: #d4af37;
        border: 1px solid #d4af37;
        background: transparent;
      }

      .btn-learn-more:hover {
        background: #f9f6f1;
      }

      .cookie-checkbox input:disabled + .checkbox-custom {
        opacity: 0.5;
      }

      @media (max-width: 1024px) {
        .cookie-banner-content {
          grid-template-columns: 1fr;
        }

        .cookie-banner-preferences {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        #cookie-consent-banner {
          border-top-width: 2px;
        }

        .cookie-banner-content {
          padding: 16px;
          gap: 16px;
        }

        .cookie-banner-text h3 {
          font-size: 1rem;
        }

        .cookie-banner-text p {
          font-size: 0.85rem;
        }

        .cookie-banner-preferences {
          grid-template-columns: 1fr;
        }

        .cookie-banner-actions {
          flex-direction: row;
          flex-wrap: wrap;
        }

        .cookie-banner-actions button,
        .cookie-banner-actions a {
          flex: 1;
          min-width: 120px;
          font-size: 0.8rem;
          padding: 8px 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Check if a cookie category is enabled
   */
  isCategoryEnabled(category) {
    const prefs = this.getPreferences();
    return prefs[category] || false;
  }

  /**
   * Reset consent (useful for settings page)
   */
  resetConsent() {
    localStorage.removeItem(this.consentKey);
    localStorage.removeItem(this.preferencesKey);
    location.reload();
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CookieConsentManager();
  });
} else {
  new CookieConsentManager();
}
