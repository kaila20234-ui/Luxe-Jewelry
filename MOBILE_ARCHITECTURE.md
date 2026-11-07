# 📱 Luxe Jewelry Mobile App - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Single Entry Point)          │
│                   mobile/index.html                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           HEADER (Fixed Top, 60px)                   │  │
│  │  Logo │ Search │ Cart │ Profile │ Dark Mode Theme   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         CONTENT AREA (Scrollable)                    │  │
│  │  - All pages rendered here dynamically               │  │
│  │  - Fade in/out animations                            │  │
│  │  - Responsive grid layouts                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     BOTTOM TAB NAVIGATION (Fixed, 70px)             │  │
│  │                                                      │  │
│  │  🏠      🛒      📦      ❤️      👤                 │  │
│  │ Shop    Cart    Orders  Wishlist Profile            │  │
│  │                                                      │  │
│  │  (Tabs change based on user role)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & Role-Based Routing

```
User Opens App
    │
    ├─→ Check localStorage for authToken?
    │
    ├─→ YES → Load from storage
    │         Get authRole (customer/manager/admin)
    │         Initialize App
    │
    └─→ NO  → Show Login Page
              Choose Role → Enter Credentials → API Login
              Save Token, Role, User → Initialize App
```

## Page Structure (Single HTML File)

All pages embedded in one HTML with CSS `display: none/block`:

```html
<div id="mobileContent">
  
  <!-- LOGIN PAGE (shown initially if not authenticated) -->
  <div id="loginPage" class="page-section active">
    <!-- Login form with role selector -->
  </div>
  
  <!-- CUSTOMER APP PAGES -->
  <div id="customerHome" class="page-section">
    <!-- Product grid with search -->
  </div>
  <div id="customerCart" class="page-section">
    <!-- Cart items and checkout -->
  </div>
  <div id="customerOrders" class="page-section">
    <!-- Order history -->
  </div>
  <div id="customerWishlist" class="page-section">
    <!-- Saved items -->
  </div>
  <div id="customerProfile" class="page-section">
    <!-- Account management -->
  </div>
  
  <!-- MANAGER APP PAGES -->
  <div id="managerDashboard" class="page-section">
    <!-- Dashboard with stats -->
  </div>
  <div id="managerComplaints" class="page-section">
    <!-- Customer complaints -->
  </div>
  <div id="managerTickets" class="page-section">
    <!-- Support tickets -->
  </div>
  <div id="managerSubscribers" class="page-section">
    <!-- Newsletter subscribers -->
  </div>
  <div id="managerProfile" class="page-section">
    <!-- Account settings -->
  </div>
  
  <!-- ADMIN APP PAGES -->
  <div id="adminDashboard" class="page-section">
    <!-- Business metrics -->
  </div>
  <div id="adminProducts" class="page-section">
    <!-- Product management -->
  </div>
  <div id="adminUsers" class="page-section">
    <!-- Staff management -->
  </div>
  <div id="adminReports" class="page-section">
    <!-- Sales analytics -->
  </div>
  <div id="adminSettings" class="page-section">
    <!-- System settings -->
  </div>
  
</div>
```

## Tab Configuration System

```javascript
TAB_CONFIG = {
  customer: [
    { id: 'home', label: 'Shop', icon: 'fa-home', page: 'customerHome' },
    { id: 'cart', label: 'Cart', icon: 'fa-shopping-cart', page: 'customerCart' },
    { id: 'orders', label: 'Orders', icon: 'fa-box', page: 'customerOrders' },
    { id: 'wishlist', label: 'Wishlist', icon: 'fa-heart', page: 'customerWishlist' },
    { id: 'profile', label: 'Profile', icon: 'fa-user', page: 'customerProfile' },
  ],
  manager: [...],
  admin: [...]
}

When user logs in:
1. Get role from authRole localStorage
2. Render tabs from TAB_CONFIG[role]
3. Navigate to first tab
4. Each tab click calls navigateToPage(tabId)
5. Page section is shown, others hidden
```

## Data Flow

```
User Action
    │
    ├─→ Click Tab Button
    │      ↓
    │   navigateToPage(tabId)
    │      ↓
    │   Hide all pages, show selected page
    │      ↓
    │   loadPageData(pageId)
    │      ↓
    │   Fetch from API
    │      ↓
    │   Render HTML with data
    │
    ├─→ Add to Cart
    │      ↓
    │   addToCart(productId, price)
    │      ↓
    │   Update AppState.cart
    │      ↓
    │   Save to localStorage
    │      ↓
    │   updateCartUI()
    │      ↓
    │   updateCartCount() → badge update
    │
    └─→ Submit Form
           ↓
        api.post(endpoint, data)
           ↓
        Backend processes
           ↓
        Response rendered
```

## Component Hierarchy

```
MOBILE APP
├── Header (sticky top)
│   ├── Logo
│   ├── Search Toggle
│   ├── Cart Toggle (customer only)
│   ├── Profile Toggle
│   └── Theme Toggle
│
├── Content Area
│   └── Page Sections (one active)
│       ├── Page Header
│       │   ├── Title
│       │   └── Subtitle
│       └── Page Content
│           ├── Cards
│           │   ├── Product Cards
│           │   ├── Order Cards
│           │   └── Info Cards
│           ├── Lists
│           │   └── List Items
│           ├── Forms
│           │   ├── Form Groups
│           │   └── Input Fields
│           └── Grids
│               ├── 2-column grid (mobile)
│               └── 3-column grid (tablet)
│
└── Bottom Tabs (fixed bottom)
    ├── Tab 1
    ├── Tab 2
    ├── Tab 3
    ├── Tab 4
    └── Tab 5 (varies by role)
```

## CSS Architecture

```
mobile-styles.css (700+ lines)
├── CSS Variables (--primary-gold, --bg-dark, etc.)
├── Global Styles (reset, base)
├── Layout Components
│   ├── Mobile App Container
│   ├── Header Styles
│   ├── Content Area
│   └── Bottom Tab Navigation
├── Reusable Components
│   ├── Buttons (primary, secondary, danger, icon)
│   ├── Forms (inputs, labels, validation)
│   ├── Cards (product cards, info cards)
│   ├── Lists (list items with icons)
│   ├── Grids (responsive 1-2-3 columns)
│   ├── Badges (status indicators)
│   ├── Alerts (success, error, info)
│   ├── Loading States (spinner)
│   └── Empty States
├── Feature-Specific
│   ├── Product Cards
│   ├── Cart Items
│   ├── Order Items
│   ├── Filters
│   └── Search Box
├── Animations
│   ├── Fade In
│   ├── Loading Spinner
│   └── Tab Transitions
├── Dark Mode
│   └── CSS Variable Overrides
└── Responsive Media Queries
    └── @media (min-width: 768px)
```

## File Structure

```
project/
└── mobile/
    ├── index.html
    │   ├── Meta tags (viewport, PWA)
    │   ├── CSS link
    │   ├── Header HTML
    │   ├── Content area (all pages)
    │   ├── Bottom tabs container
    │   └── Script tags (api-client, mobile-app)
    │
    ├── manifest.json
    │   ├── App metadata
    │   ├── Icons configuration
    │   ├── Screenshots
    │   ├── Theme colors
    │   └── App shortcuts
    │
    ├── css/
    │   └── mobile-styles.css
    │       └── All styling
    │
    ├── js/
    │   ├── mobile-app.js
    │   │   ├── State management
    │   │   ├── Authentication
    │   │   ├── Page routing
    │   │   ├── Tab navigation
    │   │   ├── Customer functions
    │   │   ├── Manager functions
    │   │   ├── Admin functions
    │   │   └── UI utilities
    │   │
    │   ├── api-client.js
    │   │   ├── APIClient class
    │   │   ├── All API methods
    │   │   ├── Service Worker registration
    │   │   └── Offline detection
    │   │
    │   └── service-worker.js
    │       ├── Installation
    │       ├── Caching strategies
    │       ├── Fetch handling
    │       ├── Background sync
    │       └── Push notifications
    │
    ├── README.md
    │   └── Complete documentation
    │
    └── (This file)
```

## State Management

```javascript
AppState = {
  user: { email, name, phone },           // Current user
  role: 'customer|manager|admin',         // User role
  token: 'jwt-token-here',                // Auth token
  cart: [{ productId, name, price, qty }],// Shopping cart
  products: [...],                        // Loaded products
  orders: [...],                          // Customer orders
  wishlist: [...],                        // Saved items
  isDarkMode: boolean,                    // Theme preference
  currentTab: 'home|cart|...',            // Active tab
}

LocalStorage:
├── authToken            → JWT token
├── authRole             → User role
├── user                 → User data (JSON)
├── cart                 → Cart items (JSON)
├── wishlist             → Wishlist items (JSON)
└── theme                → 'light|dark'
```

## API Communication Flow

```
Client Request
    │
    ├─→ APIClient.request(endpoint, options)
    │      ↓
    │   Add Authorization header with JWT token
    │      ↓
    │   fetch(url, config)
    │      ↓
    │   Service Worker intercepts
    │      ├─→ API routes: Network-first strategy
    │      │      (try network, fall back to cache)
    │      │
    │      └─→ Static assets: Cache-first strategy
    │             (try cache, fall back to network)
    │      ↓
    │   Response received
    │      ↓
    │   If 401: Clear auth, redirect to login
    │   If error: Throw error to caller
    │   If success: Return data to caller
    │      ↓
    │ Caller processes data and renders UI
```

## PWA Features

```
Service Worker (service-worker.js)
├── Install Event
│   ├── Cache static assets
│   └── Skip waiting
│
├── Activate Event
│   ├── Clean old caches
│   └── Claim clients
│
├── Fetch Event (request/response)
│   ├── API calls: Network-first
│   ├── Static: Cache-first
│   └── Fallback: Offline response
│
├── Sync Event (background)
│   ├── Sync cart
│   └── Sync orders
│
└── Push Event (notifications)
    ├── Receive notification
    ├── Display to user
    └── Handle click

Manifest (manifest.json)
├── App metadata
├── Icons (192x192, 512x512)
├── Theme colors
├── Start URL
├── Display mode (standalone)
├── Shortcuts
└── Screenshots

Installation:
1. Browser detects manifest.json
2. Show "Add to Home Screen" prompt
3. User installs app
4. App runs as standalone
5. Service Worker caches assets
6. App works offline
```

## Responsive Design

```
Desktop (1024px+)
┌─────────────────────────┐
│ Header with nav         │
├─────────────────────────┤
│                         │
│ 3-column grid layout    │
│                         │
└─────────────────────────┘
(Bottom tabs hidden)

Tablet (768px - 1023px)
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│                         │
│ 2-column grid layout    │
│                         │
├─────────────────────────┤
│ Bottom Tabs             │
└─────────────────────────┘

Mobile (<768px)
┌──────────────────┐
│ Header (60px)    │
├──────────────────┤
│                  │
│ 1-column grid    │
│ Scrollable       │
│                  │
├──────────────────┤
│ Tabs (70px)      │ ← Bottom tab bar
└──────────────────┘
```

## Loading & Performance Strategy

```
Initial Load:
1. Download HTML (all pages embedded)
2. Load CSS (mobile-styles.css)
3. Register Service Worker
4. Check authentication
5. Load user data from localStorage
6. If not authenticated: Show login page
7. If authenticated: 
   - Render tab navigation
   - Load page data via API
   - Show first tab content

Subsequent Loads (from cache):
1. Service Worker serves from cache
2. Fetch fresh data from API in parallel
3. Update UI if data changed
4. Store in localStorage for offline access

Offline Mode:
1. Service Worker serves cached responses
2. Show "offline" indicator
3. Prevent API-dependent actions
4. Queue actions for sync when online
5. Auto-sync when connection restored
```

---

**This architecture provides:**
- ✅ Single-entry-point simplicity
- ✅ Role-based customization
- ✅ Responsive mobile design
- ✅ Offline-first PWA capabilities
- ✅ Reusable component system
- ✅ Clean state management
- ✅ Efficient caching strategy
