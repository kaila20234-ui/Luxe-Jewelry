# 🚀 Quick Reference Card

## New Pages Created

| Page | URL | Purpose |
|------|-----|---------|
| Payment Summary | `/payment-summary.html` | Review order & enter delivery details |
| Payment OTP | `/payment-otp.html` | 6-digit code verification |
| Payment Process | `/payment-process.html` | Paystack initialization |
| Payment Success | `/payment-success.html` | Order confirmation & details |

---

## Flow at a Glance

```
Checkout Button Click
         ↓
   ✓ Login? Cart?
         ↓
   Payment Summary
   (Review + Address)
         ↓
   Request OTP → Email Sent
         ↓
   Payment OTP
   (Enter Code)
         ↓
   Paystack Init → Redirect
         ↓
   Paystack Payment
   (Card Entry)
         ↓
   Webhook Process
   (DB + Email + Stock)
         ↓
   Payment Success
   (Confirmation)
```

---

## Test Card

```
Card: 4111 1111 1111 1111
Exp:  12/25
CVV:  123
OTP:  123456 (or any 6 digits)
```

---

## Key Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/otp/request` | Send OTP email |
| POST | `/api/otp/verify` | Verify 6-digit code |
| POST | `/api/pay` | Initialize Paystack |
| POST | `/api/paystack/webhook` | Handle payment success |
| GET | `/api/verify-payment` | Get order details |

---

## Database Records

### OTP Session (Temporary)
- **Expires:** 5 minutes after creation
- **Deleted:** After payment or expiry
- **Fields:** sessionId, email, items, amount, verified, reference

### Sale Record (Permanent)
- **Created:** On webhook payment confirmation
- **Indexed:** By reference (unique)
- **Fields:** reference, email, items, amount, status, date, paidAt

---

## Emails Sent

1. **OTP Email**
   - Trigger: POST /api/otp/request
   - Contains: 6-digit code + expiry info

2. **Confirmation Email**
   - Trigger: Paystack webhook (charge.success)
   - Contains: Order details + total + receipt

---

## Success Indicators

✅ OTP sent to email within 2 seconds  
✅ Payment page loads with correct amount  
✅ Success page displays order details  
✅ Confirmation email received  
✅ Sale created in database  
✅ Stock decremented  
✅ Can view order in dashboard  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No OTP email | Check SMTP in .env, check spam folder |
| Payment fails | Use test card, check Paystack key |
| Sale not created | Check webhook logs, verify reference |
| Can't login | Signup first, check localStorage |
| Cart empty error | Add items before checkout |

---

## Configuration

**Required in .env:**
```
PAYSTACK_SECRET_KEY=pk_test_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
```

---

## Status Check

Server running? 
```bash
✅ http://localhost:5000 should load
```

MongoDB connected?
```bash
✅ Check server logs for "MongoDB Connected"
```

All files created?
```bash
✅ payment-summary.html
✅ payment-otp.html
✅ payment-process.html
✅ payment-success.html (updated)
✅ server.js (updated with /api/verify-payment)
✅ index.html (checkout button updated)
```

---

## Next Test

1. Open browser: http://localhost:5000
2. Sign up or login
3. Add item to cart
4. Click checkout
5. Follow the flow
6. Use test card when prompted
7. See success page

---

## Documentation Files

- 📄 **PAYMENT_FLOW_DOCUMENTATION.md** - Complete technical docs
- 📋 **PAYMENT_TESTING_GUIDE.md** - Testing instructions
- 📊 **CHECKOUT_FLOW_VISUAL.md** - Visual flow diagram
- 🔧 **IMPLEMENTATION_SUMMARY.md** - Changes made
- 🚀 **This Quick Reference Card**

---

**Everything is ready to go! 🎉**
