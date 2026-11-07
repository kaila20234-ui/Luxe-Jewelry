# Quick Start: Customer Login Feature

## Access Points

### For Customers:
1. **Login/Register Page**: `http://localhost:5000/customer-login.html`
2. **Customer Dashboard**: `http://localhost:5000/customer-dashboard.html`

### Navigation Links to Add (Optional):
Add these links to your main navigation/homepage:
```html
<a href="/customer-login.html">Login / Register</a>
<a href="/customer-dashboard.html">My Account</a>  <!-- Show only when logged in -->
```

---

## Test Account Credentials (After First Registration)

You can create test accounts by:
1. Go to `http://localhost:5000/customer-login.html`
2. Click "Create Account"
3. Fill in the form and submit

---

## API Testing (using curl or Postman)

### Register a New Customer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+234 800 1234567",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```
Response includes `token` - save this for authenticated requests.

### Get Profile (Replace TOKEN with actual token)
```bash
curl -X GET http://localhost:5000/api/customer/profile \
  -H "Authorization: Bearer TOKEN"
```

### Add Address
```bash
curl -X POST http://localhost:5000/api/customer/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "label": "Home",
    "street": "123 Main Street",
    "city": "Lagos",
    "zipcode": "100001",
    "isDefault": true
  }'
```

### Get Orders
```bash
curl -X GET http://localhost:5000/api/customer/orders \
  -H "Authorization: Bearer TOKEN"
```

---

## Feature Breakdown

### 1. User Registration & Login ✅
- Email validation
- Password strength (min 6 characters)
- Secure JWT tokens (7-day expiration)
- Auto-login after registration

### 2. Profile Management ✅
- View personal information
- Update name and phone
- View profile creation date

### 3. Address Book ✅
- Save multiple addresses
- Set default shipping address
- Edit/delete addresses
- Address labels (Home, Work, etc.)

### 4. Order History ✅
- View all past orders
- See order details (reference, amount, date, status)
- Track payment status (Paid/Pending)

### 5. Security ✅
- Change password with verification
- JWT-based authentication
- Bcrypt password hashing
- Protected routes (require login)

### 6. Checkout Integration ✅
- Guest checkout still works (no account needed)
- Logged-in customers' orders auto-linked to account
- Orders appear in dashboard immediately after payment

---

## Common Issues & Solutions

**Q: Forgot Password?**
A: Not yet implemented. Currently, users need to contact support or you can add password reset in the future.

**Q: How long is login valid?**
A: Tokens last 7 days. After expiration, user needs to login again.

**Q: Can customers change their email?**
A: Not in current implementation. You can add this feature by extending the profile update endpoint.

**Q: Are addresses required to checkout?**
A: No, guest checkout still works. Addresses are optional for registered users.

**Q: Can customers delete their account?**
A: Not currently. You can add account deletion in future updates.

---

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS Safari, Chrome Android)

---

## Performance Notes

- JWT tokens are lightweight and stateless
- Each request validates token (no session queries)
- Addresses cached in user object (not separate queries)
- Orders queried on-demand with sorting

---

## Next: Auto-populate Checkout with Saved Addresses

To implement auto-fill checkout form with customer's saved addresses:

1. In your checkout page, detect if customer is logged in:
```javascript
const token = localStorage.getItem('authToken');
if (token) {
  // Fetch customer addresses
  const response = await fetch('/api/customer/addresses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  // Populate form with addresses
}
```

2. Let customer select address from dropdown instead of typing

---

## Support Files

- **Full Documentation**: `CUSTOMER_LOGIN_GUIDE.md`
- **Database Schema**: Check `model/user.js`, `model/sales.js`
- **API Routes**: `routes/auth.js`, `routes/customer.js`
- **Frontend**: `public/customer-login.html`, `public/customer-dashboard.html`

---

**Server Status**: ✅ Running on http://localhost:5000
