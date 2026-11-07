# Luxe Jewelry Mobile App 💎

A beautiful, fully responsive mobile application for the Luxe Jewelry e-commerce platform. Built with HTML5, CSS3, and vanilla JavaScript with bottom tab navigation and Progressive Web App (PWA) support.

## Features

### 🛍️ Customer App
- **Shop**: Browse and search jewelry products with category filtering
- **Cart**: Manage items, update quantities, apply coupons
- **Orders**: View order history and track status
- **Wishlist**: Save favorite items for later
- **Profile**: Manage account information and saved addresses

### 👔 Manager App
- **Dashboard**: Overview of complaints and tickets
- **Complaints**: View and reply to customer complaints
- **Tickets**: Manage support tickets from customers
- **Subscribers**: View newsletter subscriber list
- **Profile**: Manage account settings

### 🔧 Admin App
- **Dashboard**: Statistics on products, customers, orders, revenue
- **Products**: Add, edit, and delete jewelry products
- **Staff Users**: Create and manage admin/manager accounts
- **Reports**: Sales analytics and business reports
- **Settings**: System configuration and admin account management

## Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Design System**: Gold & Dark luxury theme
- **Navigation**: Bottom tab bar (mobile standard, icon + label)
- **PWA Features**:
  - Service Worker for offline support
  - App manifest for installation
  - Cache-first strategy for static assets
  - Network-first strategy for API calls
- **API Integration**: RESTful backend with JWT authentication
- **Storage**: LocalStorage for cart, wishlist, theme preferences
- **Icons**: Font Awesome 6.4.0

## Project Structure

```
mobile/
├── index.html                 # Main entry point with all pages
├── manifest.json              # PWA app manifest
├── css/
│   └── mobile-styles.css     # All mobile styles (luxury gold theme)
├── js/
│   ├── mobile-app.js         # Main app logic & routing
│   ├── api-client.js         # API client & service worker registration
│   └── service-worker.js     # PWA service worker
└── README.md                 # This file
```

## Installation & Setup

### Prerequisites
- Node.js and npm (for running the backend)
- Modern browser with ES6 support
- Internet connection for API calls

### Steps

1. **Navigate to mobile app**:
   ```bash
   cd mobile
   ```

2. **Start a local server** (from project root):
   ```bash
   npm run dev
   # or use Python:
   python -m http.server 8000
   ```

3. **Open in browser**:
   ```
   http://localhost:3000/mobile/index.html
   # or
   http://localhost:8000/mobile/index.html
   ```

4. **On mobile device**:
   - Open the URL on your mobile browser
   - Install as app: Menu → Install App (or "Add to Home Screen")

## Authentication

The app supports three user roles:

### Customer Login
- **Email**: customer@example.com
- **Password**: password123
- **Role**: Select "Customer"

### Manager Login
- **Email**: manager@example.com
- **Password**: password123
- **Role**: Select "Manager"

### Admin Login
- **Email**: admin@example.com
- **Password**: password123
- **Role**: Select "Admin"

## Navigation

### Bottom Tab Bar
Each role has a customized tab bar with 4-5 tabs:

**Customer:**
1. 🏠 Shop - Product browsing
2. 🛒 Cart - Shopping cart
3. 📦 Orders - Order history
4. ❤️ Wishlist - Saved items
5. 👤 Profile - Account management

**Manager:**
1. 📊 Dashboard - Overview
2. ⚠️ Complaints - Customer complaints
3. 🎫 Tickets - Support tickets
4. 📬 Subscribers - Newsletter list
5. 👤 Profile - Account settings

**Admin:**
1. 📊 Dashboard - Business metrics
2. 📦 Products - Product management
3. 👥 Staff - User management
4. 📈 Reports - Sales analytics
5. ⚙️ Settings - System settings

## Features

### Search & Filter
- Real-time product search
- Category filtering
- Price range filtering
- Mobile-optimized search interface

### Cart Management
- Add/remove items
- Update quantities
- Apply discount coupons
- View cart subtotal, tax, and total
- Proceed to checkout

### Dark Mode
- Toggle theme with moon icon
- Preference saved to localStorage
- Smooth transitions between themes

### Responsive Design
- Optimized for all mobile devices
- Touch-friendly buttons (48px+ minimum)
- Bottom tab bar with icon + label
- Full-width content area
- Sticky header with search, cart, profile, theme buttons

### PWA Capabilities
- Install as standalone app
- Works offline with cached data
- Fast loading with service worker caching
- Push notification support
- App shortcuts on home screen

## API Integration

All API calls are made to `http://localhost:3000/api` by default.

### Key Endpoints Used:

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/register` - Customer registration
- `POST /auth/logout` - User logout

**Products:**
- `GET /products` - List products
- `GET /products/:id` - Product details
- `GET /search?q=...` - Search products
- `GET /categories` - Product categories

**Customer:**
- `GET /orders` - Customer orders
- `GET /wishlist` - Saved items
- `POST /cart` - Add to cart
- `GET /cart` - View cart

**Manager:**
- `GET /complaints` - Customer complaints
- `GET /tickets` - Support tickets
- `GET /admin/subscribers` - Subscribers

**Admin:**
- `GET /products` - All products
- `POST /products` - Create product
- `GET /admin/users` - Staff users
- `GET /admin/sales` - Sales data

See `mobile/js/api-client.js` for complete API client implementation.

## Customization

### Change API Base URL
Edit `mobile/js/api-client.js`:
```javascript
const api = new APIClient('https://your-api-url.com/api');
```

### Modify Colors
Edit `mobile/css/mobile-styles.css`:
```css
:root {
  --primary-gold: #d4af37;        /* Change to your primary color */
  --primary-gold-dark: #b6912e;   /* Darker shade for hover/active */
  --bg-dark: #101010;
  --bg-light: #f8f8f8;
  /* ... other colors ... */
}
```

### Add More Tabs
Edit `mobile/js/mobile-app.js`:
```javascript
const TAB_CONFIG = {
  customer: [
    { id: 'home', label: 'Shop', icon: 'fa-home', page: 'customerHome' },
    { id: 'cart', label: 'Cart', icon: 'fa-shopping-cart', page: 'customerCart' },
    // Add more tabs here
  ],
};
```

## Performance Optimization

- **Code Splitting**: Static assets cached, API responses refreshed
- **Image Optimization**: Use appropriate image sizes for mobile
- **Lazy Loading**: Products load on demand
- **Minification**: All CSS and JS should be minified for production
- **Compression**: Server should gzip responses

## Browser Support

- iOS Safari 12+
- Android Chrome 80+
- Firefox for Android 68+
- Edge for Android 18+
- Samsung Internet 12+

## Accessibility

- WCAG 2.1 AA compliant
- Semantic HTML structure
- ARIA labels for icons
- Keyboard navigation support
- Touch target sizes 48px+ minimum
- High contrast dark mode support

## Testing

### Manual Testing Checklist
- [ ] Customer login and app navigation
- [ ] Product browsing and search
- [ ] Add/remove items from cart
- [ ] Manager complaints view
- [ ] Admin products management
- [ ] Dark mode toggle
- [ ] Responsive on different screen sizes
- [ ] PWA installation
- [ ] Offline functionality

### Test on Actual Devices
Use Chrome DevTools remote debugging or physical devices:
```bash
# For iOS: Use Safari DevTools
# For Android: Use Chrome DevTools
```

## Production Deployment

1. **Build for Production**:
   - Minify CSS and JavaScript
   - Optimize images
   - Generate icons in multiple sizes
   - Create screenshot assets

2. **Deploy to Server**:
   ```bash
   # Copy mobile folder to public directory
   cp -r mobile /var/www/luxe-jewelry/public/
   ```

3. **Update API Base URL**:
   - Change to production API URL
   - Update manifest.json start_url

4. **Enable HTTPS**:
   - PWA requires HTTPS
   - Update manifest.json theme_color
   - Configure service worker caching strategy

5. **Monitor Performance**:
   - Use Lighthouse CI
   - Monitor PWA metrics
   - Track Core Web Vitals

## Troubleshooting

### Service Worker not updating
- Clear cache: DevTools → Storage → Clear site data
- Unregister: DevTools → Application → Service Workers → Unregister

### API calls failing
- Check backend is running on port 3000
- Verify API base URL in api-client.js
- Check CORS headers in backend

### Offline mode not working
- Ensure service worker is registered
- Check cache size limits
- Verify static assets are in STATIC_ASSETS list

### App not installing
- Must be served over HTTPS (except localhost)
- Verify manifest.json is valid
- Check all required fields in manifest

## Future Enhancements

- [ ] Push notifications for order updates
- [ ] Biometric authentication (fingerprint/face)
- [ ] Payment gateway integration
- [ ] Real-time notifications with WebSockets
- [ ] Augmented Reality product preview
- [ ] Voice search capability
- [ ] Multi-language support
- [ ] Progressive image loading

## License

Copyright © 2024 Luxe Jewelry. All rights reserved.

## Support

For issues or questions:
- Email: support@luxejewelry.com
- Website: https://luxejewelry.com
- Documentation: See API_DOCUMENTATION.md

---

**Built with ✨ for premium mobile shopping experience**
