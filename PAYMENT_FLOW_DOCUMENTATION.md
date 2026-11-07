# Complete Payment Flow Documentation

## Overview
The checkout process has been redesigned to provide a complete payment experience:
1. **Payment Summary Page** - Review order details
2. **OTP Verification** - Secure verification via email
3. **Payment Processing** - Seamless Paystack integration
4. **Success Page** - Order confirmation with details
5. **Transaction Recording** - Automatic sales record creation
6. **Email Confirmation** - Order receipt sent to customer

---

## Complete Flow Breakdown

### Step 1: Checkout Initiation (index.html)
**What happens:**
- User adds items to cart
- User clicks "Proceed to Checkout" button
- System checks if user is logged in
- Cart data and user data stored in sessionStorage
- Redirects to `/payment-summary.html`

**Code Location:** `public/index.html` lines 1497-1537

**Example:**
```javascript
window.location.href = '/payment-summary.html';
```

---

### Step 2: Payment Summary Page (/payment-summary.html)
**What happens:**
- Displays all items in the cart with prices
- Shows order totals (subtotal, tax at 5%, free shipping)
- User enters/confirms delivery information (name, email, phone, address)
- System pre-fills form with data from localStorage
- User can review all details before proceeding

**Key Features:**
- Order items display with individual prices
- Real-time total calculation
- Form validation
- Clean, professional UI with gradient header
- Info box explaining secure Paystack payment

**Sample Data:**
```json
{
  "items": [
    {
      "name": "Gold Ring",
      "price": 50000,
      "qty": 1
    }
  ],
  "subtotal": 50000,
  "tax": 2500,
  "shipping": 0,
  "total": 52500
}
```

---

### Step 3: OTP Verification Page (/payment-otp.html)
**What happens:**
- User clicks "Proceed to Payment" on summary page
- System sends OTP request to `/api/otp/request`
- 6-digit code sent to user's email
- OTP verification page loads with 5-minute countdown timer
- User enters 6-digit code

**Features:**
- 6-digit OTP input field (numbers only)
- 5-minute countdown timer (warning color at < 1 min)
- Resend OTP button (max 3 attempts)
- Email address displayed for confirmation
- Auto-focus on OTP input field

**OTP Request Payload:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "phone": "+234 800 000 0000",
  "address": "123 Main Street, Lagos",
  "items": [
    {
      "_id": "product123",
      "name": "Gold Ring",
      "price": 50000,
      "qty": 1
    }
  ],
  "amount": 52500
}
```

**Backend Response:**
```json
{
  "success": true,
  "sessionId": "session_abc123xyz",
  "message": "OTP sent to your email"
}
```

---

### Step 4: Payment Processing Page (/payment-process.html)
**What happens:**
- User enters valid OTP code
- System verifies OTP at `/api/otp/verify`
- Session marked as verified
- Redirects to payment processing page
- System calls `/api/pay` to initialize Paystack payment
- User redirected to Paystack payment gateway

**Paystack Initialization:**
```json
{
  "email": "customer@example.com",
  "amount": 5250000,  // in kobo (₦52,500)
  "reference": "ref_abc123xyz",
  "callback_url": "http://localhost:5000/payment-success.html"
}
```

---

### Step 5: Paystack Payment
**What happens:**
- User enters card details on Paystack page (Visa, Mastercard, etc.)
- User completes payment
- Paystack processes transaction
- Paystack sends webhook to `/api/paystack/webhook`

**Webhook Processing:**
- Verifies webhook signature
- Creates Sale record in database
- Sends order confirmation email
- Updates product stock (decrements by qty ordered)
- Marks OTP session as complete
- Returns success status to Paystack

---

### Step 6: Payment Success Page (/payment-success.html)
**What happens:**
- After payment, user redirected to success page with reference parameter
- System queries `/api/verify-payment?reference=ref_abc123xyz`
- Displays complete order confirmation with:
  - Order reference number
  - Customer information (name, email, phone, address)
  - All items ordered with individual prices
  - Order summary (subtotal, tax, total)
  - Order date and time
- User can view full order history or return home

**Success Page Data:**
```json
{
  "success": true,
  "sale": {
    "reference": "ref_abc123xyz",
    "name": "John Doe",
    "email": "customer@example.com",
    "phone": "+234 800 000 0000",
    "address": "123 Main Street, Lagos",
    "items": [
      {
        "productName": "Gold Ring",
        "price": 50000,
        "quantity": 1,
        "subtotal": 50000
      }
    ],
    "amount": 52500,
    "status": "paid",
    "date": "2024-12-28T10:30:00.000Z",
    "paidAt": "2024-12-28T10:35:00.000Z"
  }
}
```

---

## Database Records Created

### 1. OTP Session (Temporary)
```javascript
{
  sessionId: "session_abc123xyz",
  email: "customer@example.com",
  name: "John Doe",
  phone: "+234 800 000 0000",
  address: "123 Main Street, Lagos",
  items: [...],
  amount: 52500,
  verified: true,
  reference: "ref_abc123xyz",
  expiresAt: "2024-12-28T10:45:00Z"  // deleted after payment
}
```

### 2. Sale Record (Permanent)
```javascript
{
  _id: ObjectId("..."),
  reference: "ref_abc123xyz",
  userId: ObjectId("user123") || null,  // if logged in
  email: "customer@example.com",
  name: "John Doe",
  phone: "+234 800 000 0000",
  address: "123 Main Street, Lagos",
  amount: 52500,
  status: "paid",
  paidAt: "2024-12-28T10:35:00Z",
  otpVerified: true,
  items: [
    {
      productId: "prod123",
      productName: "Gold Ring",
      price: 50000,
      quantity: 1,
      subtotal: 50000
    }
  ],
  date: "2024-12-28T10:30:00Z"
}
```

---

## Email Communications

### 1. OTP Email (sent by /api/otp/request)
**To:** customer@example.com
**Subject:** Your Luxe Jewelry Order Verification Code
**Body:** 
- 6-digit code
- 5-minute expiration notice
- Instruction to enter code on verification page

### 2. Order Confirmation Email (sent by webhook)
**To:** customer@example.com
**Subject:** Order Confirmation #ref_abc123xyz
**Body:**
- Order reference number
- Complete order details
- Itemized list with prices
- Total amount paid
- Delivery address
- Thank you message

---

## API Endpoints

### 1. POST /api/otp/request
**Purpose:** Request OTP for checkout
**Input:**
```json
{
  "email": "string",
  "name": "string",
  "phone": "string",
  "address": "string",
  "items": [
    {
      "_id": "string",
      "name": "string",
      "price": "number",
      "qty": "number"
    }
  ],
  "amount": "number"
}
```
**Output:**
```json
{
  "success": true,
  "sessionId": "string",
  "message": "OTP sent"
}
```

### 2. POST /api/otp/verify
**Purpose:** Verify OTP code
**Input:**
```json
{
  "sessionId": "string",
  "code": "string (6 digits)"
}
```
**Output:**
```json
{
  "success": true,
  "message": "OTP verified"
}
```

### 3. POST /api/pay
**Purpose:** Initialize Paystack payment
**Input:**
```json
{
  "sessionId": "string"
}
```
**Output:**
```json
{
  "status": true,
  "url": "https://checkout.paystack.com/...",
  "reference": "ref_abc123xyz",
  "sessionId": "string"
}
```

### 4. POST /api/paystack/webhook
**Purpose:** Handle Paystack payment confirmation
**Input:** Webhook from Paystack with signature verification
**Processing:**
- Creates Sale record
- Sends confirmation email
- Updates product stock
- Marks session as complete

### 5. GET /api/verify-payment?reference=ref_abc123xyz
**Purpose:** Retrieve order details for success page
**Output:**
```json
{
  "success": true,
  "sale": {
    "reference": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "items": [...],
    "amount": "number",
    "status": "paid",
    "date": "ISO date",
    "paidAt": "ISO date"
  }
}
```

---

## Testing Scenarios

### Scenario 1: Successful Payment (Visa)
1. Login to customer account
2. Add item to cart
3. Click "Proceed to Checkout"
4. Review order on summary page
5. Enter delivery details
6. Click "Proceed to Payment"
7. Enter OTP code from email
8. On Paystack page: Use test card `4111 1111 1111 1111`, expiry `12/25`, CVV `123`
9. Verify payment on success page
10. **Expected:** Sale created, email sent, stock updated

### Scenario 2: Expired OTP
1-6. Same as Scenario 1
7. Wait for OTP to expire (5 minutes)
8. Try to enter OTP
9. **Expected:** Error message "OTP expired"

### Scenario 3: Resend OTP
1-6. Same as Scenario 1
7. Click "Resend OTP"
8. Enter new OTP code
9. **Expected:** New code sent, process continues

### Scenario 4: Cart Empty
1. Login to customer account
2. Do NOT add items to cart
3. Try to click "Proceed to Checkout"
4. **Expected:** Alert "Your cart is empty"

### Scenario 5: Not Logged In
1. Add item to cart without logging in
2. Click "Proceed to Checkout"
3. **Expected:** Alert "Please log in" + redirect to login page

---

## File Structure

```
public/
├── index.html                 # Main storefront
├── payment-summary.html       # Step 2: Order review
├── payment-otp.html          # Step 3: OTP verification
├── payment-process.html      # Step 4: Payment processing
├── payment-success.html      # Step 5: Success confirmation
├── customer-login.html       # Customer login
└── customer-dashboard.html   # Order history

server.js
├── /api/otp/request         # Endpoint 1
├── /api/otp/verify          # Endpoint 2
├── /api/pay                 # Endpoint 3
├── /api/paystack/webhook    # Endpoint 4
└── /api/verify-payment      # Endpoint 5

model/
├── user.js                  # Customer model
└── sales.js                 # Sales/Order model
```

---

## Key Features Implemented

✅ **Complete Order Summary Page**
- Itemized display with prices
- Real-time total calculation
- Delivery address input
- Professional UI

✅ **Secure OTP Verification**
- 6-digit email-based OTP
- 5-minute expiration timer
- Resend functionality
- Rate limiting

✅ **Seamless Paystack Integration**
- Automatic payment initialization
- Secure callback handling
- Reference tracking
- Webhook verification

✅ **Automatic Transaction Recording**
- Sale record creation on payment success
- Customer information stored
- Item details preserved
- Stock management updated

✅ **Email Confirmations**
- OTP sent to customer email
- Order confirmation with details
- Reference number included
- Professional formatting

✅ **Success Page with Details**
- Order reference and status
- Customer information
- Itemized order display
- Total amount paid
- Links to order history and home

---

## Security Considerations

1. **OTP Validation**: Webhooks verify Paystack signature with HMAC-SHA512
2. **Email Verification**: OTP sent to provided email before payment
3. **Reference Tracking**: Unique reference per transaction prevents duplicates
4. **Session Management**: Sessions expire after 5 minutes
5. **Stock Protection**: Stock updates only after confirmed payment
6. **Rate Limiting**: OTP requests limited to prevent abuse

---

## Environment Variables Required

```
MONGO_URI=mongodb://127.0.0.1:27017/luxe_jewelry
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
JWT_SECRET=your_jwt_secret
PORT=5000
```

---

## Troubleshooting

### OTP Not Received
- Check email spam folder
- Verify SMTP credentials in .env
- Check server logs for email errors

### Payment Not Initializing
- Verify PAYSTACK_SECRET_KEY is set
- Check Paystack callback URL matches
- Review server logs for initialization errors

### Sale Not Created
- Verify webhook signature is valid
- Check MongoDB connection
- Review webhook logs in server console

### Stock Not Updated
- Verify product IDs in items array
- Check product exists in database
- Review stock update logic in webhook handler

---

## Next Steps (Optional Enhancements)

1. SMS notifications for order status
2. Payment failure recovery with retry
3. Partial payment/installment support
4. Order tracking dashboard
5. Admin order management interface
6. Customer order history filters
7. Receipt PDF generation and download
8. Multi-payment gateway support

---

**Version:** 1.0  
**Last Updated:** December 28, 2024  
**Status:** Production Ready
