# Welcome Email System Setup Guide

## Overview

A comprehensive welcome email system has been implemented for new customer signups. When a customer creates an account, they automatically receive a professional HTML email with:

- Personalized greeting with their name
- Account details confirmation
- Exclusive member benefits list
- 15% discount welcome offer (code: WELCOME15)
- Getting started guide
- Account security tips
- Links to shop and support

## Files Created/Modified

### New Files
1. **routes/email.js** - Email sending service with templates
2. **.env.example** - Environment configuration template

### Modified Files
1. **routes/auth.js** - Added welcome email trigger on signup

## Setup Instructions

### Step 1: Install Nodemailer

```bash
npm install nodemailer
```

Or if you're using yarn:
```bash
yarn add nodemailer
```

### Step 2: Configure Gmail (or Your Email Service)

**Option A: Using Gmail with App Password (Recommended)**

1. Go to Google Account: https://myaccount.google.com
2. Enable 2-Factor Authentication (Settings → Security → 2-Step Verification)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer"
5. Google will generate a 16-character password - copy this

**Option B: Using Another Email Service**

For Outlook, Yahoo, SendGrid, AWS SES, or other services, update the transporter configuration in `routes/email.js`:

```javascript
// For Outlook
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// For SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

### Step 3: Create .env File

1. Copy `.env.example` to `.env` in your project root:

```bash
cp .env.example .env
```

2. Fill in your values:

```env
MONGODB_URI=mongodb://localhost:27017/luxe_jewelry
JWT_SECRET=your-super-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM="Luxe Jewelry" <noreply@luxejewelry.com>
SHOP_URL=http://localhost:5000
NODE_ENV=development
PORT=5000
```

### Step 4: Update server.js to Load Environment Variables

Make sure your `server.js` has this at the very top:

```javascript
require('dotenv').config();
```

If you don't have dotenv installed:

```bash
npm install dotenv
```

### Step 5: Test the Email System

**Test Email Sending:**

Create a test file `test-email.js`:

```javascript
require('dotenv').config();
const { sendWelcomeEmail } = require('./routes/email');

const testUser = {
  name: 'John Doe',
  email: 'your-test-email@gmail.com',
  phone: '234-812-345-6789',
  createdAt: new Date()
};

sendWelcomeEmail(testUser).then(result => {
  console.log('Result:', result);
  process.exit(0);
});
```

Run it:
```bash
node test-email.js
```

**Expected output:**
```
✅ Welcome email sent successfully: <message-id>
```

### Step 6: Verify Everything Works

1. Start your server:
```bash
npm start
```

2. Go to signup page: http://localhost:5000/customer-signup.html

3. Fill in the form with a test email address you have access to

4. Click "Create Account"

5. Check the email inbox - you should receive the welcome email within a few seconds

## Email Template Features

### HTML Email Components

1. **Header Section**
   - Premium gradient background (gold #d4af37)
   - "LUXE" branding
   - "Premium Jewelry Experience" tagline

2. **Greeting**
   - Personalized welcome message
   - Emoji celebration

3. **Account Details**
   - Displays user name, email, phone
   - Shows registration date
   - Professional formatted box

4. **Member Benefits**
   - 6 key benefits with checkmarks
   - Features like order tracking, exclusive offers

5. **Welcome Offer Banner**
   - 15% discount code: WELCOME15
   - Validity information
   - Eye-catching promo box

6. **Getting Started Guide**
   - 4-step process to get started
   - Clear action items

7. **Shop Collections**
   - Product category links
   - Shop button CTA

8. **Security Tips**
   - Password protection advice
   - Account security best practices

9. **Footer**
   - Social media links
   - Important links (Help, Contact, Privacy, Terms)
   - Copyright and disclaimer

### Responsive Design

- Mobile-optimized email template
- Breakpoints for screens < 600px
- Readable on all email clients (Gmail, Outlook, Apple Mail, etc.)

### Text Version

- Plain text fallback for email clients that don't support HTML
- All important information included
- Readable formatting

## Customization Options

### Change Welcome Discount Code

In `routes/email.js`, find this line:

```javascript
<div class="promo-code">WELCOME15</div>
```

Change `WELCOME15` to your code and update the percentage as needed.

### Change Email Colors

Primary color (gold): `#d4af37`
Secondary color (black): `#101010`

Find and replace in `routes/email.js` to use your brand colors.

### Add Company Information

Update these in the email template:

- Company name: "LUXE" → your brand name
- Tagline: "Premium Jewelry Experience" → your tagline
- Social links: Add your actual social media URLs
- Footer links: Add your actual page URLs

### Customize Shop URL

In `.env`:
```env
SHOP_URL=http://localhost:5000
```

Change to your production URL when deploying.

## Troubleshooting

### Email Not Sending

**Problem:** "Nodemailer not found" error
```
Solution: npm install nodemailer
```

**Problem:** "Cannot find module 'dotenv'"
```
Solution: npm install dotenv
```

**Problem:** "Email sent but not received"
```
1. Check EMAIL_USER and EMAIL_PASSWORD are correct
2. Check Gmail security settings (allow less secure apps)
3. Check email isn't in spam folder
4. Check server logs for error messages
```

**Problem:** SMTP Authentication Error

```
Gmail: Make sure 2FA is enabled and using App Password (16 chars, no spaces)
Outlook: Allow less secure apps in account settings
```

**Problem:** Email template not showing correctly

Email clients have varying HTML support:
- Gmail: Supports most CSS
- Outlook: Limited CSS support
- Apple Mail: Good CSS support

The template is designed to work across all clients. If styling issues occur:

1. Test with Gmail first
2. Check email client's HTML/CSS limitations
3. Use inline CSS instead of `<style>` tags

### Testing Without Real Email

For development, use Ethereal Email (fake SMTP service):

```javascript
const nodemailer = require('nodemailer');

// Create test account
const testAccount = await nodemailer.createTestAccount();

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass
  }
});

// Then check logs for preview URL
```

## Advanced Features

### Order Confirmation Emails

A `sendOrderConfirmationEmail()` function is already included in `routes/email.js`. Use it when processing orders:

```javascript
const { sendOrderConfirmationEmail } = require('./routes/email');

// After order created
await sendOrderConfirmationEmail(user, order);
```

### Custom Email Templates

Add more email templates to `routes/email.js`:

```javascript
function getPasswordResetEmailHTML(user, resetLink) {
  return `
    <!-- Your HTML here -->
  `;
}

async function sendPasswordResetEmail(user, resetLink) {
  // Implementation
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail  // Add new function
};
```

### Email Analytics

Add email tracking by including a tracking pixel:

```javascript
html: `${emailHTML}<!-- Email tracking pixel --><img src="https://your-domain.com/track?id=${user._id}" width="1" height="1" />`
```

## Security Considerations

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use App Passwords** - Not your real Gmail password
3. **Validate email addresses** - Already done in User model
4. **Limit email sending** - Add rate limiting for production
5. **Monitor email bounces** - Track invalid email addresses

## Production Deployment

### Environment Variables

For production, set environment variables in your hosting platform:

**Heroku:**
```bash
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
heroku config:set JWT_SECRET=your-secret-key
heroku config:set MONGODB_URI=your-mongodb-url
```

**AWS:**
Use AWS Secrets Manager or Parameter Store

**DigitalOcean/Vercel/Others:**
Use their environment variable configuration panels

### Email Service Recommendations for Production

For high-volume email sending, consider:

1. **SendGrid** - Free tier: 100 emails/day
2. **Mailgun** - Free tier: 5,000 emails/month
3. **AWS SES** - Very affordable, great for high volume
4. **Postmark** - Premium service with excellent deliverability

## Testing Checklist

- [ ] Nodemailer installed
- [ ] Gmail app password created
- [ ] `.env` file configured
- [ ] dotenv loaded in `server.js`
- [ ] Send test email successfully
- [ ] Email received in inbox
- [ ] Email formatting displays correctly
- [ ] All links are clickable
- [ ] Mobile view looks good
- [ ] No sensitive data in email
- [ ] Discount code works
- [ ] Dashboard link works
- [ ] Shop link works

## Summary

The welcome email system is now fully integrated and ready to use. When new customers sign up:

1. Account is created in database
2. JWT token is generated
3. Welcome email is automatically sent
4. User is redirected to dashboard
5. Email includes personalized welcome, discount code, and getting started guide

All files are production-ready and follow email best practices for deliverability and styling.
