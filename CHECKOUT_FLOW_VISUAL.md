# Complete Checkout Flow - Visual Guide

## 🛒 Checkout Journey

```
START: Customer adds items to cart
  │
  ├─ [Item 1: Gold Ring - ₦50,000 x1]
  ├─ [Item 2: Diamond Necklace - ₦100,000 x1]
  └─ Cart Total: ₦150,000

           │
           ▼
    CLICK "PROCEED TO CHECKOUT"
           │
           ├─ ✓ Check if logged in
           │  └─ ✗ Not logged in? → Redirect to /customer-login.html
           │
           ├─ ✓ Check if cart empty
           │  └─ ✗ Cart empty? → Alert "Your cart is empty"
           │
           └─ ✓ Store data in sessionStorage
              └─ { cartData: { items, subtotal }, sessionData: { userEmail, userName } }

           │
           ▼
    STEP 1: PAYMENT SUMMARY PAGE (/payment-summary.html)
    ═══════════════════════════════════════════════════════════════
    
    📦 ORDER ITEMS REVIEW
    ┌─────────────────────────────────────────────────────────┐
    │ Gold Ring                     ₦50,000 x 1  = ₦50,000   │
    │ Diamond Necklace              ₦100,000 x 1 = ₦100,000  │
    ├─────────────────────────────────────────────────────────┤
    │ Subtotal:                                    ₦150,000   │
    │ Tax (5%):                                    ₦7,500     │
    │ Shipping:                                    ₦0 (Free)  │
    │ ═══════════════════════════════════════════════════════ │
    │ TOTAL:                                       ₦157,500   │
    └─────────────────────────────────────────────────────────┘
    
    👤 DELIVERY INFORMATION FORM
    ┌─────────────────────────────────────────────────────────┐
    │ Full Name:      John Doe                                │
    │ Email:          john@example.com                        │
    │ Phone:          +234 800 000 0000                       │
    │ Address:        123 Main Street, Lagos, Nigeria         │
    │                                                         │
    │ [Payment Method] Paystack Card Payment      [SELECTED]  │
    │                                                         │
    │ [← Back]                  [Proceed to Payment →]        │
    └─────────────────────────────────────────────────────────┘

           │
           ├─ Validate all fields filled
           └─ POST /api/otp/request
              {
                "email": "john@example.com",
                "name": "John Doe",
                "phone": "+234 800 000 0000",
                "address": "123 Main Street, Lagos, Nigeria",
                "items": [...],
                "amount": 157500
              }

           │
           ▼
    BACKEND: OTP SESSION CREATED & EMAIL SENT
    ═══════════════════════════════════════════════════════════════
    
    ✓ OTP Session stored in database (5-minute expiry)
    ✓ 6-digit code generated
    ✓ Email sent to john@example.com:
    
    ┌─────────────────────────────────────────────────────────┐
    │ Subject: Your Luxe Jewelry Order Verification Code      │
    │                                                         │
    │ Dear John Doe,                                          │
    │                                                         │
    │ Your verification code is: 📬 345827                    │
    │ This code expires in 5 minutes.                         │
    │                                                         │
    │ If you didn't request this, please ignore.              │
    │                                                         │
    │ Best regards,                                           │
    │ Luxe Jewelry Team                                       │
    └─────────────────────────────────────────────────────────┘
    
    ✓ Response: { success: true, sessionId: "session_abc123xyz" }

           │
           ▼
    STEP 2: OTP VERIFICATION PAGE (/payment-otp.html)
    ═══════════════════════════════════════════════════════════════
    
    🔐 VERIFY YOUR IDENTITY
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │      Enter the 6-digit code sent to                    │
    │      john@example.com                                  │
    │                                                         │
    │          [_][_][_][_][_][_]                            │
    │                                                         │
    │      Time remaining: 4:33                              │
    │                                                         │
    │      Didn't receive the code?                          │
    │      [Resend OTP] (Attempts left: 2)                   │
    │                                                         │
    │      [← Back]            [Verify & Pay →]              │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
    
    USER ENTERS: 345827
    
           │
           └─ POST /api/otp/verify
              { sessionId: "session_abc123xyz", code: "345827" }

           │
           ▼
    BACKEND: OTP VERIFICATION
    ═══════════════════════════════════════════════════════════════
    
    ✓ Fetch OTP session from database
    ✓ Compare code: 345827 == 345827? ✓ MATCH
    ✓ Mark session.verified = true
    ✓ Response: { success: true, message: "OTP verified" }

           │
           ▼
    STEP 3: PAYMENT PROCESSING (/payment-process.html)
    ═══════════════════════════════════════════════════════════════
    
    ⏳ REDIRECTING TO PAYMENT
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │          ⟳ Processing...                               │
    │                                                         │
    │   Initializing payment with Paystack...                │
    │                                                         │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
    
    BACKEND: PAYSTACK INITIALIZATION
    ┌─────────────────────────────────────────────────────────┐
    │ POST /api/pay                                           │
    │                                                         │
    │ 1. Fetch verified OTP session                          │
    │ 2. Generate unique reference: ref_157500_abc123       │
    │ 3. POST to api.paystack.co/transaction/initialize      │
    │    {                                                    │
    │      "email": "john@example.com",                      │
    │      "amount": 15750000,    (in kobo)                  │
    │      "reference": "ref_157500_abc123",                │
    │      "callback_url": "http://localhost/payment-success"│
    │    }                                                    │
    │                                                         │
    │ 4. Response includes authorization_url                │
    │ 5. Return to frontend with payment URL                │
    └─────────────────────────────────────────────────────────┘

           │
           ▼
    PAYSTACK CHECKOUT PAGE
    ═══════════════════════════════════════════════════════════════
    
    💳 COMPLETE YOUR PAYMENT
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  Luxe Jewelry                     Amount: ₦157,500     │
    │                                                         │
    │  CARD DETAILS                                           │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │ Card Number:  4111 1111 1111 1111              │  │
    │  │ Expiry Date:  12/25                            │  │
    │  │ CVV:          123                              │  │
    │  │ Cardholder:   John Doe                         │  │
    │  └─────────────────────────────────────────────────┘  │
    │                                                         │
    │  🔒 Your payment is secure and encrypted              │
    │                                                         │
    │                   [PAY ₦157,500]                       │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
    
    USER CLICKS: [PAY ₦157,500]
    
           │
           ▼
    PAYSTACK PROCESSES PAYMENT
    ┌─────────────────────────────────────────────────────────┐
    │ 1. Card validated                                       │
    │ 2. Amount charged: ₦157,500                            │
    │ 3. Transaction successful                              │
    │ 4. Sends webhook to /api/paystack/webhook              │
    │    Signature: HMAC-SHA512 verification                 │
    │    Event: charge.success                               │
    │    Reference: ref_157500_abc123                        │
    └─────────────────────────────────────────────────────────┘

           │
           ▼
    BACKEND: WEBHOOK PROCESSING (/api/paystack/webhook)
    ═══════════════════════════════════════════════════════════════
    
    ✓ Step 1: Verify signature
       └─ HMAC-SHA512(body) == header signature? ✓ VALID
    
    ✓ Step 2: Find OTP session by reference
       └─ OtpSession.findOne({ reference: "ref_157500_abc123" })
    
    ✓ Step 3: Check if sale already exists
       └─ Prevent duplicate processing
    
    ✓ Step 4: CREATE SALE RECORD
       DB INSERT:
       ┌─────────────────────────────────────────────────────┐
       │ _id:          ObjectId("...")                       │
       │ reference:    "ref_157500_abc123"                   │
       │ userId:       ObjectId("user123") or null           │
       │ email:        "john@example.com"                    │
       │ name:         "John Doe"                            │
       │ phone:        "+234 800 000 0000"                   │
       │ address:      "123 Main Street, Lagos, Nigeria"     │
       │ amount:       157500                                │
       │ status:       "paid"                                │
       │ paidAt:       2024-12-28T10:35:00Z                 │
       │ otpVerified:  true                                  │
       │ items: [                                            │
       │   {                                                  │
       │     productId: "prod001",                           │
       │     productName: "Gold Ring",                       │
       │     price: 50000,                                   │
       │     quantity: 1,                                    │
       │     subtotal: 50000                                 │
       │   },                                                │
       │   {                                                  │
       │     productId: "prod002",                           │
       │     productName: "Diamond Necklace",                │
       │     price: 100000,                                  │
       │     quantity: 1,                                    │
       │     subtotal: 100000                                │
       │   }                                                  │
       │ ]                                                   │
       │ date:         2024-12-28T10:30:00Z                 │
       └─────────────────────────────────────────────────────┘
    
    ✓ Step 5: SEND ORDER CONFIRMATION EMAIL
       To: john@example.com
       ┌─────────────────────────────────────────────────────┐
       │ Subject: Order Confirmation #ref_157500_abc123     │
       │                                                     │
       │ Dear John Doe,                                      │
       │                                                     │
       │ Thank you for your purchase! Your order has been   │
       │ confirmed and is being processed.                   │
       │                                                     │
       │ ORDER DETAILS                                       │
       │ ─────────────────────────────────────────────────  │
       │ Reference: ref_157500_abc123                        │
       │ Date: December 28, 2024 10:30 AM                   │
       │                                                     │
       │ ITEMS                                               │
       │ ─────────────────────────────────────────────────  │
       │ 1. Gold Ring          x1   ₦50,000                │
       │ 2. Diamond Necklace   x1   ₦100,000               │
       │                                                     │
       │ TOTAL PAID: ₦157,500                               │
       │                                                     │
       │ DELIVERY ADDRESS                                    │
       │ John Doe                                            │
       │ 123 Main Street, Lagos, Nigeria                     │
       │ +234 800 000 0000                                   │
       │                                                     │
       │ Your order will be delivered within 3-5 business   │
       │ days. Thank you for shopping with Luxe Jewelry!    │
       │                                                     │
       │ Best regards,                                       │
       │ Luxe Jewelry Team                                   │
       └─────────────────────────────────────────────────────┘
    
    ✓ Step 6: UPDATE PRODUCT STOCK
       For each item:
       ├─ Find product in database
       ├─ Decrement stock by quantity ordered
       ├─ Update available status
       └─ Save to database
       
       Example:
       Product "Gold Ring"
       ├─ Stock before: 10
       ├─ Quantity ordered: 1
       └─ Stock after: 9
    
    ✓ Step 7: DELETE OTP SESSION
       └─ Cleanup temporary session data
    
    ✓ Step 8: Return 200 OK to Paystack
       └─ Webhook processed successfully

           │
           ▼
    PAYSTACK REDIRECTS TO CALLBACK
    Redirect to: /payment-success.html?reference=ref_157500_abc123

           │
           ▼
    STEP 4: SUCCESS CONFIRMATION PAGE (/payment-success.html)
    ═══════════════════════════════════════════════════════════════
    
    ✅ PAYMENT SUCCESSFUL!
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │                        ✅                              │
    │                                                         │
    │              PAYMENT SUCCESSFUL!                       │
    │                                                         │
    │          Thank you for your purchase                  │
    │                                                         │
    ├─────────────────────────────────────────────────────────┤
    │                                                         │
    │  ORDER REFERENCE: ref_157500_abc123                    │
    │  Status: [PAID]                                        │
    │  Order Date: December 28, 2024 10:30 AM               │
    │                                                         │
    │  DELIVERY INFORMATION                                  │
    │  John Doe                                              │
    │  john@example.com                                      │
    │  +234 800 000 0000                                     │
    │  123 Main Street, Lagos, Nigeria                       │
    │                                                         │
    │  ITEMS ORDERED                                         │
    │  1. Gold Ring               ₦50,000                   │
    │  2. Diamond Necklace        ₦100,000                  │
    │                                                         │
    │  Subtotal:                  ₦150,000                  │
    │  Tax (5%):                  ₦7,500                    │
    │  Shipping:                  ₦0                        │
    │  ─────────────────────────────────────────────────    │
    │  TOTAL PAID:                ₦157,500                  │
    │                                                         │
    │  📧 Order confirmation has been sent to your email    │
    │                                                         │
    │  [View Order History]   [Return Home]                │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
    
    PAGE ACTIONS:
    GET /api/verify-payment?reference=ref_157500_abc123
    ├─ Query database for sale
    ├─ Retrieve all order details
    └─ Display on success page

           │
           ▼
    CUSTOMER RECEIVES EMAILS
    ┌─────────────────────────────────────────────────────────┐
    │ EMAIL 1: OTP Code (during checkout)                   │
    │ EMAIL 2: Order Confirmation (after payment)           │
    │                                                         │
    │ Both emails contain important information about the   │
    │ order and verification codes.                          │
    └─────────────────────────────────────────────────────────┘

           │
           ▼
    CUSTOMER CAN:
    ✓ View order in order history
    ✓ Track delivery status
    ✓ Download receipt
    ✓ Return home to continue shopping
    
    END: Order Complete ✅
```

---

## 📊 Data Flow Summary

```
┌─────────────────────────┐
│ Cart Data               │
│ - Items                 │
│ - Quantities            │
│ - Prices                │
└────────┬────────────────┘
         │
         ▼ sessionStorage
┌─────────────────────────┐
│ Payment Summary Page    │
│ - Display order         │
│ - Collect address       │
└────────┬────────────────┘
         │ /api/otp/request
         ▼
┌─────────────────────────┐
│ OTP Session Created     │
│ - Email code sent       │
│ - Session stored (5min) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ OTP Verification Page   │
│ - Verify code           │
│ - Check timer           │
└────────┬────────────────┘
         │ /api/otp/verify
         ▼
┌─────────────────────────┐
│ Session Verified        │
│ - Mark verified = true  │
│ - Ready for payment     │
└────────┬────────────────┘
         │ /api/pay
         ▼
┌─────────────────────────┐
│ Paystack Initialized    │
│ - Reference generated   │
│ - Payment URL returned  │
└────────┬────────────────┘
         │
         ▼ Redirect
┌─────────────────────────┐
│ Paystack Payment Page   │
│ - Card entry            │
│ - Process transaction   │
└────────┬────────────────┘
         │ Payment Success
         ▼
┌─────────────────────────┐
│ Webhook Received        │
│ - Verify signature      │
│ - Reference valid       │
└────────┬────────────────┘
         │
         ├─▶ Create Sale
         ├─▶ Send Email
         ├─▶ Update Stock
         └─▶ Delete Session
         │
         ▼
┌─────────────────────────┐
│ Redirect to Success     │
│ - Reference parameter   │
│ - Order confirmed       │
└────────┬────────────────┘
         │ /api/verify-payment
         ▼
┌─────────────────────────┐
│ Success Page            │
│ - Display order details │
│ - Link to history       │
└─────────────────────────┘
```

---

## 🎯 Key Milestones

| Step | Page | Action | Result |
|------|------|--------|--------|
| 1 | index.html | Click Checkout | Validate & redirect to summary |
| 2 | payment-summary.html | Review order | Request OTP |
| 3 | payment-otp.html | Enter 6-digit code | Verify & redirect to process |
| 4 | payment-process.html | Auto-initialize | Redirect to Paystack |
| 5 | Paystack | Enter card details | Process payment |
| 6 | Webhook | Receive confirmation | Create sale & send email |
| 7 | payment-success.html | Display order | Show confirmation |

---

## ✅ Validation Points

- ✓ User is logged in
- ✓ Cart is not empty
- ✓ Delivery details filled
- ✓ OTP code matches
- ✓ Payment amount matches
- ✓ Webhook signature valid
- ✓ Reference not duplicate
- ✓ Sale record created
- ✓ Email delivered
- ✓ Stock updated

---

**This is the complete journey from checkout to order confirmation!** 🎉
