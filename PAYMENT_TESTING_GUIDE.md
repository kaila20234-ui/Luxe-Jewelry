# Quick Start - Testing the Payment Flow

## Test Credentials

### Customer Login
- **Email:** Use any email (e.g., `test@example.com`)
- **Password:** Use any password
- **Account Creation:** Sign up at `/customer-signup.html`

### Test Paystack Cards
Paystack provides test cards for development:

#### Successful Payment (Visa)
- Card: `4111 1111 1111 1111`
- Expiry: `12/25`
- CVV: `123`
- OTP: `123456` (any 6 digits)

#### Failed Payment
- Card: `4000 0000 0000 0002`
- Expiry: `12/25`
- CVV: `123`

---

## Step-by-Step Testing

### 1. **Prepare Customer Account**
```
1. Go to http://localhost:5000/customer-signup.html
2. Fill in:
   - Name: John Doe
   - Email: test@example.com
   - Phone: +2349012892640
   - Password: Test123!
   - Address: 123 Main Street, Lagos
3. Click Sign Up
4. You're automatically logged in
```

### 2. **Add Items to Cart**
```
1. Go to http://localhost:5000/index.html
2. Browse products
3. Select quantity (e.g., 1)
4. Click "Add to Cart"
5. Repeat for multiple items (optional)
6. Click cart icon to verify items
```

### 3. **Proceed to Checkout**
```
1. Click "Proceed to Checkout" button
2. Verify cart items on Payment Summary page
3. Review/edit delivery address
4. Click "Proceed to Payment"
```

### 4. **Verify OTP**
```
1. Check your email inbox (usually arrives in 1-2 seconds)
2. Find email from Luxe Jewelry with 6-digit OTP
3. Go back to OTP verification page
4. Enter 6-digit code
5. Click "Verify & Pay"
```

### 5. **Complete Paystack Payment**
```
1. You're redirected to Paystack
2. Enter test card: 4111 1111 1111 1111
3. Expiry: 12/25
4. CVV: 123
5. OTP: 123456 (or any 6 digits)
6. Click "Pay"
```

### 6. **View Order Confirmation**
```
1. After payment, you see success page
2. Review order details:
   - Order reference
   - Delivery address
   - Items ordered
   - Total paid
3. Check email for order confirmation
4. Click "View Order History" to see orders
```

---

## Expected Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Customer Login (customer-signup.html)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Browse & Add Items (index.html)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Click Checkout Button (index.html)                      │
│    ✓ Check login status                                    │
│    ✓ Verify cart not empty                                 │
│    ✓ Store data in sessionStorage                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Payment Summary Page (payment-summary.html)             │
│    ✓ Display items and prices                              │
│    ✓ Show order total (with tax)                           │
│    ✓ Collect delivery details                              │
│    ✓ Click "Proceed to Payment"                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         POST /api/otp/request
         ↓          ✓          ↓
    [OTP Email] [Session DB] [Response]
         ↑_________________________↓
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. OTP Verification Page (payment-otp.html)                │
│    ✓ Receive email with OTP code                           │
│    ✓ Enter 6-digit code                                    │
│    ✓ Click "Verify & Pay"                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         POST /api/otp/verify
         ↓        ✓        ↓
    [Verify] [DB Update] [Response]
         ←────────────────→
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Payment Processing (payment-process.html)               │
│    ✓ Call /api/pay to initialize Paystack                  │
│    ✓ Redirect to Paystack checkout                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         Paystack Checkout Gateway
         ↓        ✓        ↓
   [Card Input] [Process] [Success]
         ←────────────────→
                     │
                     ▼
         POST /api/paystack/webhook
         ↓          ✓          ↓
   [Verify Sign] [Process] [Sale Record]
         ├─→ [Email Sent]
         ├─→ [Stock Updated]
         └─→ [Session Deleted]
                     │
                     ▼
    Paystack Redirects to success page
    ↓                          ↓
  [Reference URL Parameter]  [Redirect]
                     │
                     ▼
         GET /api/verify-payment
         ↓         ✓        ↓
   [Query DB] [Fetch] [Response]
         ←────────────────→
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Success Page (payment-success.html)                     │
│    ✓ Display order details                                 │
│    ✓ Show confirmation message                             │
│    ✓ Links to history and home                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Monitoring Server Output

Watch the server terminal for these success messages:

```
✅ Customer signup successful
POST /api/otp/request ✓
  → OTP sent to test@example.com

✅ OTP verified
POST /api/otp/verify ✓
  → Session marked verified

✅ Paystack initialized
POST /api/pay ✓
  → Payment URL: https://checkout.paystack.com/...

🔔 Paystack webhook: charge.success
  → Sale created with reference: ref_abc123xyz
  → Order confirmation email sent to test@example.com
  → Stock updated for products
  → OTP session deleted
```

---

## Checking Email

### For Gmail Accounts
1. Go to https://myaccount.google.com
2. Select "Security" in the left menu
3. Scroll to "App passwords"
4. Generate app password for your app
5. Use this in SMTP_PASS instead of your regular password

### Test Email Service
If you don't have email configured:
1. Use Mailtrap (https://mailtrap.io)
2. Get SMTP credentials
3. Add to .env:
   ```
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=465
   SMTP_USER=your_mailtrap_user
   SMTP_PASS=your_mailtrap_pass
   ```

---

## Debugging Tips

### Issue: "Cart is empty"
- ✓ Make sure you added items to cart
- ✓ Items must show in cart icon count

### Issue: "Please log in"
- ✓ Sign up first at /customer-signup.html
- ✓ Verify email is saved in localStorage
- ✓ Check browser console for errors

### Issue: "OTP not received"
- ✓ Check spam folder
- ✓ Verify SMTP settings in .env
- ✓ Check server logs: `node server.js`
- ✓ Look for "OTP sent to..." message

### Issue: "Payment failed"
- ✓ Use test card: 4111 1111 1111 1111
- ✓ Any future expiry date (12/25+)
- ✓ Any 3-digit CVV
- ✓ For OTP: enter 123456

### Issue: "Sale not created"
- ✓ Verify webhook received (check server logs)
- ✓ Verify MongoDB is running
- ✓ Check sale record: `db.sales.find()`

### Issue: "Email not sent"
- ✓ Verify SMTP credentials
- ✓ Use app password (not regular Gmail password)
- ✓ Check server logs for email errors
- ✓ Try Mailtrap for testing

---

## Database Inspection

### View All Sales
```bash
mongo luxe_jewelry
> db.sales.find().pretty()
```

### View Specific Order
```bash
mongo luxe_jewelry
> db.sales.findOne({ reference: "ref_abc123xyz" })
```

### View OTP Sessions (before deletion)
```bash
mongo luxe_jewelry
> db.otpsessions.find().pretty()
```

### View Products
```bash
mongo luxe_jewelry
> db.products.find().pretty()
```

---

## Success Indicators

✅ **All working correctly when:**
- Customer can sign up and log in
- Items can be added to cart
- Checkout button navigates to summary page
- OTP email arrives within 2 seconds
- Paystack payment page loads with correct amount
- After payment, success page shows order details
- Order confirmation email received
- Sale record created in database
- Product stock decremented
- Customer can view order in history

---

## Production Checklist

Before going live:
- [ ] Set real Paystack Secret Key in .env
- [ ] Configure real email SMTP credentials
- [ ] Set secure JWT_SECRET
- [ ] Enable HTTPS on frontend
- [ ] Update FRONTEND_ORIGIN in .env for CORS
- [ ] Test with real payment cards
- [ ] Set proper error messages (no stack traces)
- [ ] Enable rate limiting on all endpoints
- [ ] Set up error logging/monitoring
- [ ] Test email templates on mobile
- [ ] Set up backup for MongoDB
- [ ] Configure automatic SSL certificates

---

## Contact & Support

For issues:
1. Check server logs: `node server.js`
2. Check browser console: F12 → Console tab
3. Check MongoDB: `mongo luxe_jewelry`
4. Review PAYMENT_FLOW_DOCUMENTATION.md
5. Check .env file configuration

---

**Happy Testing!** 🎉
