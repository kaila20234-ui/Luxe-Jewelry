// routes/email.js - Email sending service
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 465;
const SMTP_USER = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  requireTLS: SMTP_PORT === 587 && !SMTP_SECURE,
  authMethod: 'PLAIN',
  connectionTimeout: 30000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 14,
  debug: process.env.NODE_ENV !== 'production',
  logger: process.env.NODE_ENV !== 'production',
  tls: {
    minVersion: 'TLSv1.2',
  },
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Welcome Email Template
function getWelcomeEmailHTML(user) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Luxe Jewelry</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e0e0e0;
        }
        
        .header {
          background: linear-gradient(135deg, #d4af37 0%, #b6912e 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: 3px;
          margin-bottom: 10px;
        }
        
        .header p {
          font-size: 1rem;
          opacity: 0.9;
        }
        
        .content {
          padding: 40px 30px;
          background: #f9f9f9;
        }
        
        .greeting {
          font-size: 1.3rem;
          color: #101010;
          margin-bottom: 20px;
          font-weight: 600;
        }
        
        .section {
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-left: 4px solid #d4af37;
          border-radius: 4px;
        }
        
        .section h2 {
          color: #d4af37;
          font-size: 1.2rem;
          margin-bottom: 15px;
          font-weight: 600;
        }
        
        .section p {
          margin-bottom: 10px;
          line-height: 1.8;
          color: #555;
        }
        
        .feature-list {
          list-style: none;
          padding: 0;
          margin-bottom: 15px;
        }
        
        .feature-list li {
          padding: 10px 0;
          padding-left: 30px;
          position: relative;
          color: #555;
        }
        
        .feature-list li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #d4af37;
          font-weight: bold;
          font-size: 1.2rem;
        }
        
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #d4af37, #b6912e);
          color: white;
          text-decoration: none;
          padding: 15px 40px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
        }
        
        .cta-button:hover {
          background: linear-gradient(135deg, #b6912e, #9a7425);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }
        
        .account-details {
          background: #f0f0f0;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 600;
          color: #101010;
        }
        
        .detail-value {
          color: #666;
          text-align: right;
        }
        
        .promo-banner {
          background: linear-gradient(135deg, #fffacd, #fff8dc);
          border: 2px dashed #d4af37;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        
        .promo-banner p {
          font-size: 1rem;
          color: #101010;
          margin-bottom: 15px;
        }
        
        .promo-code {
          background: white;
          border: 2px solid #d4af37;
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: 700;
          color: #d4af37;
          font-size: 1.3rem;
          letter-spacing: 2px;
          display: inline-block;
        }
        
        .footer {
          background: #101010;
          color: white;
          padding: 30px;
          text-align: center;
          font-size: 0.9rem;
        }
        
        .footer p {
          margin-bottom: 10px;
        }
        
        .social-links {
          margin: 20px 0;
        }
        
        .social-links a {
          display: inline-block;
          width: 40px;
          height: 40px;
          background: #d4af37;
          color: white;
          text-decoration: none;
          border-radius: 50%;
          line-height: 40px;
          margin: 0 5px;
          font-weight: 600;
        }
        
        .footer-links {
          margin: 15px 0;
        }
        
        .footer-links a {
          color: #d4af37;
          text-decoration: none;
          margin: 0 15px;
        }
        
        .footer-links a:hover {
          text-decoration: underline;
        }
        
        .divider {
          height: 2px;
          background: linear-gradient(to right, transparent, #d4af37, transparent);
          margin: 20px 0;
        }
        
        @media (max-width: 600px) {
          .header h1 {
            font-size: 1.8rem;
          }
          
          .content {
            padding: 20px 15px;
          }
          
          .section {
            padding: 15px;
          }
          
          .detail-row {
            flex-direction: column;
          }
          
          .detail-value {
            text-align: left;
            margin-top: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1>LUXE</h1>
          <p>Premium Jewelry Experience</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <!-- Greeting -->
          <div class="greeting">
            Welcome, ${user.name}! ✨
          </div>
          
          <p style="margin-bottom: 20px; color: #555; line-height: 1.8;">
            Thank you for creating an account with <strong>Luxe Jewelry</strong>. We're thrilled to have you join our community of jewelry enthusiasts!
          </p>
          
          <!-- Account Information -->
          <div class="section">
            <h2>Your Account Details</h2>
            <div class="account-details">
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${user.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${user.email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${user.phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Member Since:</span>
                <span class="detail-value">${new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
          
          <!-- Welcome Benefits -->
          <div class="section">
            <h2>Exclusive Member Benefits</h2>
            <ul class="feature-list">
              <li><strong>Save Your Preferences:</strong> Store multiple addresses and checkout faster</li>
              <li><strong>Order Tracking:</strong> Monitor your purchases in real-time</li>
              <li><strong>Early Access:</strong> Get first dibs on new collections and exclusive launches</li>
              <li><strong>Personalized Recommendations:</strong> Discover jewelry curated just for you</li>
              <li><strong>Exclusive Offers:</strong> Members-only discounts and special promotions</li>
              <li><strong>Birthday Rewards:</strong> Special gifts and discounts on your special day</li>
            </ul>
          </div>
          
          <!-- Welcome Offer -->
          <div class="promo-banner">
            <p style="font-size: 1.1rem; margin-bottom: 10px;">
              🎁 Welcome to the Luxe Family!
            </p>
            <p>Use this exclusive code for <strong>15% OFF</strong> your first purchase:</p>
            <div class="promo-code">WELCOME15</div>
            <p style="margin-top: 15px; font-size: 0.9rem; color: #999;">
              Valid for 30 days • Excludes sale items
            </p>
          </div>
          
          <!-- What to Do Next -->
          <div class="section">
            <h2>What's Next?</h2>
            <p style="margin-bottom: 15px;">Here's how to get started with your new account:</p>
            <ol style="padding-left: 20px; color: #555;">
              <li style="margin-bottom: 10px;"><strong>Complete Your Profile:</strong> Add your preferred shipping addresses for faster checkout</li>
              <li style="margin-bottom: 10px;"><strong>Browse Our Collections:</strong> Explore our curated selection of fine jewelry</li>
              <li style="margin-bottom: 10px;"><strong>Start Shopping:</strong> Use your welcome code WELCOME15 on your first order</li>
              <li style="margin-bottom: 10px;"><strong>Track Your Orders:</strong> Access your order history anytime from your dashboard</li>
            </ol>
          </div>
          
          <!-- CTA Button -->
          <div class="button-container">
            <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/customer-dashboard.html" class="cta-button">
              Go to Your Dashboard
            </a>
          </div>
          
          <!-- Shop Now -->
          <div class="section">
            <h2>Shop Our Collections</h2>
            <p>Browse our latest arrivals and find your perfect piece:</p>
            <ul class="feature-list">
              <li>Elegant Rings & Bands</li>
              <li>Stunning Necklaces & Pendants</li>
              <li>Exquisite Bracelets</li>
              <li>Beautiful Earrings</li>
              <li>Custom & Bespoke Services</li>
            </ul>
            <div class="button-container">
              <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}" class="cta-button" style="background: #101010;">
                Shop Now
              </a>
            </div>
          </div>
          
          <!-- Account Security -->
          <div class="section" style="background: #fff3cd; border-left-color: #ffc107;">
            <h2 style="color: #101010;">Keep Your Account Secure</h2>
            <ul class="feature-list">
              <li><strong>Never share your password</strong> with anyone</li>
              <li><strong>Use a strong, unique password</strong> to protect your account</li>
              <li><strong>Update your profile regularly</strong> to keep information current</li>
              <li><strong>Report suspicious activity</strong> immediately to our support team</li>
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Luxe Jewelry</strong></p>
          <p>Premium Jewelry for the Discerning Eye</p>
          
          <div class="divider" style="opacity: 0.3;"></div>
          
          <div class="social-links">
            <a href="https://instagram.com" title="Instagram">f</a>
            <a href="https://twitter.com" title="Twitter">t</a>
            <a href="https://facebook.com" title="Facebook">📘</a>
            <a href="https://pinterest.com" title="Pinterest">📌</a>
          </div>
          
          <div class="footer-links">
            <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/help">Help Center</a>
            <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/contact">Contact Us</a>
            <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/privacy">Privacy Policy</a>
            <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/terms">Terms & Conditions</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 0.85rem; opacity: 0.8;">
            © ${new Date().getFullYear()} Luxe Jewelry. All rights reserved.
          </p>
          
          <p style="margin-top: 15px; font-size: 0.8rem; opacity: 0.7;">
            This is an automated message. Please do not reply to this email.<br>
            To update your preferences, visit your <a href="${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/customer-dashboard.html" style="color: #d4af37;">account settings</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Text version of welcome email (for email clients that don't support HTML)
function getWelcomeEmailText(user) {
  return `
WELCOME TO LUXE JEWELRY

Hello ${user.name},

Thank you for creating an account with Luxe Jewelry. We're thrilled to have you join our community of jewelry enthusiasts!

YOUR ACCOUNT DETAILS
Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone}
Member Since: ${new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

EXCLUSIVE MEMBER BENEFITS
✓ Save Your Preferences - Store multiple addresses and checkout faster
✓ Order Tracking - Monitor your purchases in real-time
✓ Early Access - Get first dibs on new collections and exclusive launches
✓ Personalized Recommendations - Discover jewelry curated just for you
✓ Exclusive Offers - Members-only discounts and special promotions
✓ Birthday Rewards - Special gifts and discounts on your special day

WELCOME OFFER
Use this exclusive code for 15% OFF your first purchase:
WELCOME15

Valid for 30 days • Excludes sale items

WHAT'S NEXT?
1. Complete Your Profile - Add your preferred shipping addresses for faster checkout
2. Browse Our Collections - Explore our curated selection of fine jewelry
3. Start Shopping - Use your welcome code WELCOME15 on your first order
4. Track Your Orders - Access your order history anytime from your dashboard

SHOP OUR COLLECTIONS
• Elegant Rings & Bands
• Stunning Necklaces & Pendants
• Exquisite Bracelets
• Beautiful Earrings
• Custom & Bespoke Services

KEEP YOUR ACCOUNT SECURE
• Never share your password with anyone
• Use a strong, unique password to protect your account
• Update your profile regularly to keep information current
• Report suspicious activity immediately to our support team

For more information, visit our Help Center at: ${process.env.SHOP_URL || 'https://luxe-jewelry.com'}/help

---
© ${new Date().getFullYear()} Luxe Jewelry. All rights reserved.
This is an automated message. Please do not reply to this email.
  `;
}

// Send Welcome Email
async function sendWelcomeEmail(user) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Luxe Jewelry" <noreply@luxejewelry.com>',
      to: user.email,
      subject: `Welcome to Luxe Jewelry, ${user.name}! 🎁 Get 15% OFF Your First Purchase`,
      html: getWelcomeEmailHTML(user),
      text: getWelcomeEmailText(user),
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send Order Confirmation Email (for future use)
async function sendOrderConfirmationEmail(user, order) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Luxe Jewelry" <noreply@luxejewelry.com>',
      to: user.email,
      subject: `Order Confirmation - #${order.reference}`,
      html: `
        <h2>Order Confirmed!</h2>
        <p>Thank you for your order, ${user.name}.</p>
        <p><strong>Order ID:</strong> ${order.reference}</p>
        <p><strong>Amount:</strong> ₦${order.amount.toLocaleString()}</p>
        <p>We'll send you shipping details soon!</p>
      `,
      text: `Order Confirmed!\n\nThank you for your order, ${user.name}.\n\nOrder ID: ${order.reference}\nAmount: ₦${order.amount.toLocaleString()}\n\nWe'll send you shipping details soon!`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending order email:', error);
    return { success: false, error: error.message };
  }
}

// Email Verification Template
function getVerificationEmailHTML(userName, verificationLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Luxe Jewelry</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e0e0e0;
        }
        .header {
          background: linear-gradient(135deg, #d4af37 0%, #b6912e 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 2.5rem;
          margin: 0;
          font-weight: 300;
          letter-spacing: 3px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 1.3rem;
          font-weight: 600;
          color: #101010;
          margin-bottom: 20px;
        }
        .verification-button {
          background: linear-gradient(135deg, #d4af37 0%, #b6912e 100%);
          color: white;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
          margin: 30px 0;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .footer {
          background: #101010;
          color: white;
          padding: 30px;
          text-align: center;
          font-size: 0.9rem;
        }
        .security-note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .copy-code {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          word-break: break-all;
          font-family: monospace;
          font-size: 0.9rem;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>LUXE</h1>
          <p>Verify Your Email Address</p>
        </div>
        
        <div class="content">
          <p class="greeting">Hi ${userName},</p>
          
          <p>Thank you for creating an account with Luxe Jewelry! To complete your registration and access all features, please verify your email address.</p>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="verification-button">Verify Email Address</a>
          </div>
          
          <p style="color: #999; font-size: 0.9rem; margin: 20px 0;">Or copy and paste this link in your browser:</p>
          <div class="copy-code">${verificationLink}</div>
          
          <div class="security-note">
            <strong>🔒 Security Notice:</strong> If you didn't create this account, please ignore this email or contact our support team immediately.
          </div>
          
          <p style="color: #999; font-size: 0.9rem;">
            This verification link will expire in 24 hours. If it expires, you can request a new one from your account.
          </p>
          
          <p>Once verified, you'll be able to:</p>
          <ul style="color: #666;">
            <li>Browse our exclusive jewelry collections</li>
            <li>Save your favorite items</li>
            <li>Complete purchases securely</li>
            <li>Track your orders</li>
            <li>Access member-only discounts</li>
          </ul>
        </div>
        
        <div class="footer">
          <p><strong>Luxe Jewelry</strong></p>
          <p>If you have any questions, contact us at support@luxejewelry.com</p>
          <p style="margin-top: 20px; font-size: 0.8rem; opacity: 0.8;">
            © ${new Date().getFullYear()} Luxe Jewelry. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Password Reset Email Template
function getPasswordResetEmailHTML(userName, resetLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Luxe Jewelry</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e0e0e0;
        }
        
        .header {
          background: linear-gradient(135deg, #d4af37 0%, #b6912e 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: 2px;
        }
        
        .content {
          padding: 40px 20px;
        }
        
        .greeting {
          font-size: 1.1rem;
          margin-bottom: 20px;
          color: #333;
        }
        
        .message {
          margin: 20px 0;
          color: #666;
          line-height: 1.8;
        }
        
        .reset-button-container {
          text-align: center;
          margin: 40px 0;
        }
        
        .reset-button {
          display: inline-block;
          padding: 14px 40px;
          background: linear-gradient(135deg, #d4af37 0%, #b6912e 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: transform 0.3s ease;
        }
        
        .reset-button:hover {
          transform: translateY(-2px);
        }
        
        .link-text {
          margin-top: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-left: 3px solid #d4af37;
          word-break: break-all;
        }
        
        .link-text p {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 8px;
        }
        
        .link-text a {
          color: #d4af37;
          text-decoration: none;
          font-weight: 600;
        }
        
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
          font-size: 0.9rem;
        }
        
        .warning strong {
          display: block;
          margin-bottom: 5px;
        }
        
        .footer {
          background: #f5f5f5;
          padding: 20px;
          text-align: center;
          font-size: 0.85rem;
          color: #999;
          border-top: 1px solid #e0e0e0;
        }
        
        .footer p {
          margin: 5px 0;
        }
        
        .social-links {
          margin-top: 15px;
        }
        
        .social-links a {
          color: #d4af37;
          text-decoration: none;
          margin: 0 10px;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>LUXE</h1>
          <p>Password Reset</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hi ${userName},
          </div>
          
          <div class="message">
            We received a request to reset your password. Click the button below to set a new password.
          </div>
          
          <div class="reset-button-container">
            <a href="${resetLink}" class="reset-button">Reset Password</a>
          </div>
          
          <div class="link-text">
            <p><strong>Or copy and paste this link in your browser:</strong></p>
            <a href="${resetLink}">${resetLink}</a>
          </div>
          
          <div class="warning">
            <strong>⏱️ Link Expires in 1 Hour</strong>
            This password reset link will expire in 1 hour. If you don't reset your password within this time, you'll need to request a new link.
          </div>
          
          <div class="message" style="margin-top: 30px;">
            <strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; 2024 Luxe Jewelry. All rights reserved.</p>
          <p>Premium Jewelry for Extraordinary Moments</p>
          <div class="social-links">
            <a href="https://luxejewelry.com">Visit Store</a>
            <a href="https://luxejewelry.com/contact">Contact Us</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send Verification Email
async function sendVerificationEmail(email, userName, verificationLink) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Luxe Jewelry" <noreply@luxejewelry.com>',
      to: email,
      subject: 'Verify Your Email Address - Luxe Jewelry',
      html: getVerificationEmailHTML(userName, verificationLink),
      text: `Hi ${userName},\n\nVerify your email address to complete your registration:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nLuxe Jewelry Team`,
      headers: {
        'X-Priority': '3',
        'Importance': 'Normal'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

// Send Password Reset Email
async function sendPasswordResetEmail(email, userName, resetLink) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Luxe Jewelry" <noreply@luxejewelry.com>',
      to: email,
      subject: 'Reset Your Password - Luxe Jewelry',
      html: getPasswordResetEmailHTML(userName, resetLink),
      text: `Hi ${userName},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\nLuxe Jewelry Team`,
      headers: {
        'X-Priority': '2',
        'Importance': 'High'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  getWelcomeEmailHTML,
  getWelcomeEmailText
};
