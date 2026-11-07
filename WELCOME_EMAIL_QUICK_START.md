# Welcome Email System - Quick Start

## What's New?

Your signup flow now automatically sends professional welcome emails to new customers with:

✅ Personalized greeting with customer name  
✅ Account confirmation details  
✅ List of exclusive member benefits  
✅ 15% off welcome discount code (WELCOME15)  
✅ Getting started guide (4 steps)  
✅ Shop navigation  
✅ Account security tips  
✅ Social media & support links  
✅ Fully responsive HTML design  
✅ Text fallback for all email clients  

## Files Added

| File | Purpose |
|------|---------|
| `routes/email.js` | Email templates and sending logic |
| `.env.example` | Configuration template |
| `EMAIL_SETUP_GUIDE.md` | Complete setup documentation |

## Files Modified

| File | Changes |
|------|---------|
| `routes/auth.js` | Added welcome email trigger on signup |

## Installation (5 Minutes)

### 1. Install Nodemailer
```bash
npm install nodemailer dotenv
```

### 2. Setup Gmail
- Go to: https://myaccount.google.com/apppasswords
- Generate 16-character app password
- Copy the password

### 3. Create .env File
```bash
cp .env.example .env
```

Edit `.env` and add:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/luxe_jewelry
SHOP_URL=http://localhost:5000
```

### 4. Update server.js
Add at the very top:
```javascript
require('dotenv').config();
```

### 5. Test It
```bash
npm start
```

Then sign up at: http://localhost:5000/customer-signup.html

Check your email inbox for the welcome message!

## Email Template Preview

```
┌─────────────────────────────┐
│    [LUXE Header - Gold]     │
│ Premium Jewelry Experience  │
└─────────────────────────────┘

Welcome, John Doe! 🎉

YOUR ACCOUNT DETAILS
├─ Name: John Doe
├─ Email: john@example.com
├─ Phone: +234-812-345-6789
└─ Member Since: Nov 28, 2025

EXCLUSIVE MEMBER BENEFITS
✓ Save Your Preferences
✓ Order Tracking
✓ Early Access to New Collections
✓ Personalized Recommendations
✓ Exclusive Offers
✓ Birthday Rewards

🎁 WELCOME OFFER
Use code: WELCOME15
Get: 15% OFF your first purchase
Valid: 30 days (excludes sale items)

WHAT'S NEXT?
1. Complete Your Profile
2. Browse Our Collections
3. Start Shopping (use WELCOME15)
4. Track Your Orders

SHOP OUR COLLECTIONS
[SHOP NOW Button]

┌─────────────────────────────┐
│  [Footer - Black Background]│
│  Social Links • Help • Contact│
│  Privacy • Terms • Copyright │
└─────────────────────────────┘
```

## How It Works

### Flow Diagram

```
User Signs Up
    ↓
Form Submission → /api/auth/register
    ↓
Validation ✓
    ↓
Create User in Database
    ↓
✅ Send Welcome Email (routes/email.js)
    ↓
Generate JWT Token
    ↓
Redirect to Dashboard
    ↓
Email Lands in Inbox
```

### Code Flow

```javascript
// In routes/auth.js

router.post('/register', async (req, res) => {
  // ... validation and user creation ...
  
  await user.save();
  
  // NEW: Send welcome email
  const emailResult = await sendWelcomeEmail(user);
  
  // Generate token and respond
  const token = jwt.sign(...);
  res.status(201).json({
    success: true,
    token,
    user: user.toJSON(),
    emailSent: emailResult.success  // Confirm email was sent
  });
});
```

## Customization Examples

### Change Discount Code

In `routes/email.js`, find:
```html
<div class="promo-code">WELCOME15</div>
```

Change to:
```html
<div class="promo-code">WELCOME20</div>
```

### Change Brand Colors

Gold (`#d4af37`) → Your brand color  
Black (`#101010`) → Your secondary color

### Add Social Links

In footer section of `routes/email.js`:
```javascript
<a href="https://instagram.com/yourbrand" title="Instagram">f</a>
```

### Change Shop URL

In `.env`:
```
SHOP_URL=https://yourdomain.com
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module 'nodemailer'" | Run: `npm install nodemailer` |
| "Cannot find module 'dotenv'" | Run: `npm install dotenv` |
| Email not received | Check spam folder, verify Gmail settings |
| SMTP error | Verify app password (16 chars, no spaces) |
| Email formatting broken | Works on Gmail best, some clients limit CSS |

## API Response

When signup is successful, the response includes:

```json
{
  "success": true,
  "message": "Account created successfully. Welcome email sent!",
  "token": "eyJhbGc...",
  "emailSent": true,  // ← New field
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+234-812-345-6789",
    "createdAt": "2025-11-28T10:30:00Z"
  }
}
```

## Advanced Features

### Email Preview HTML

View the raw HTML template:
```javascript
const { getWelcomeEmailHTML } = require('./routes/email');
const html = getWelcomeEmailHTML(user);
// Copy and paste into https://mjml.io/ to preview
```

### Text Version

For accessibility and email clients that don't support HTML:
```javascript
const { getWelcomeEmailText } = require('./routes/email');
const text = getWelcomeEmailText(user);
```

### Send Order Confirmation Emails

When processing orders:
```javascript
const { sendOrderConfirmationEmail } = require('./routes/email');
await sendOrderConfirmationEmail(user, order);
```

### Add More Email Templates

Create new functions in `routes/email.js`:
- `sendPasswordResetEmail()`
- `sendOrderShippedEmail()`
- `sendOrderDeliveredEmail()`
- `sendPromotionalEmail()`

## Production Checklist

- [ ] Nodemailer installed
- [ ] `.env` file created and configured
- [ ] dotenv loaded in server.js
- [ ] Test email sent successfully
- [ ] Email received and formatted correctly
- [ ] All links work (dashboard, shop)
- [ ] Mobile view looks good
- [ ] No sensitive data in email
- [ ] MONGODB_URI points to correct database
- [ ] JWT_SECRET is strong and unique
- [ ] NODE_ENV set to 'production'
- [ ] Email service credentials are secure

## Email Client Compatibility

| Client | Support | Notes |
|--------|---------|-------|
| Gmail | ✅ Excellent | Best overall support |
| Outlook | ✅ Good | Limited CSS, still readable |
| Apple Mail | ✅ Excellent | Mobile and desktop |
| Thunderbird | ✅ Good | Desktop email client |
| iPhone Mail | ✅ Good | Responsive design works |
| Android | ✅ Good | Responsive design works |

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure Gmail / email service
3. ✅ Create `.env` file
4. ✅ Test email sending
5. 🔄 Monitor email deliverability
6. 🔄 Customize template to match brand
7. 🔄 Add more email types (order, shipping, etc.)
8. 🔄 Set up email analytics
9. 🔄 Deploy to production
10. 🔄 Monitor for bounces/complaints

## Support

For issues or improvements:

1. Check `EMAIL_SETUP_GUIDE.md` for detailed troubleshooting
2. Review email service documentation
3. Test with https://putsmail.com/ for email preview
4. Check email headers for server information
5. Enable debugging in Nodemailer:

```javascript
const transporter = nodemailer.createTransport({
  // ... config ...
  logger: true,
  debug: true
});
```

## Summary

Your welcome email system is ready! When customers sign up:

1. They get an account in your database
2. They receive a professional welcome email
3. They see the 15% discount code
4. They're guided to their new dashboard
5. They're ready to shop!

Emails are fully branded, responsive, and ready for production. Customize as needed for your brand!
