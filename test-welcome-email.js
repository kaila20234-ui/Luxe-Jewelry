require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER || 'luxejewelry04@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('Testing welcome email sending...\n');
console.log('SMTP Config:');
console.log('  Host:', SMTP_HOST);
console.log('  Port:', SMTP_PORT);
console.log('  User:', SMTP_USER);
console.log('  Password:', SMTP_PASS ? '***' : 'MISSING');

// Create transporter (same config as main server)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  requireTLS: true,
  tls: { minVersion: 'TLSv1.2' },
  debug: true,
  logger: true
});

const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #d4af37, #b6912e); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f6f1; padding: 30px; border-radius: 0 0 8px 8px; }
    .highlight { color: #d4af37; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💎 Luxe Jewelry</h1>
      <p>Welcome to Our Newsletter!</p>
    </div>
    <div class="content">
      <h2>Thank You for Subscribing!</h2>
      <p>Welcome to the Luxe Jewelry newsletter! You'll now receive:</p>
      <ul>
        <li><span class="highlight">Exclusive Offers</span> - Special discounts just for subscribers</li>
        <li><span class="highlight">New Collections</span> - First access to our latest pieces</li>
        <li><span class="highlight">Style Tips</span> - Expert jewelry styling advice</li>
        <li><span class="highlight">Special Events</span> - VIP invitations to exclusive events</li>
      </ul>
      <p>We respect your privacy and will never share your email. You can unsubscribe anytime.</p>
    </div>
  </div>
</body>
</html>
`;

async function sendWelcomeEmail() {
  try {
    console.log('\nAttempting to send welcome email...\n');
    
    const info = await transporter.sendMail({
      from: `Luxe Jewelry <${SMTP_USER}>`,
      to: 'hafizukaila81@gmail.com',
      subject: 'Welcome to Luxe Jewelry Newsletter!',
      text: 'Thank you for subscribing to Luxe Jewelry newsletter!',
      html: welcomeHtml,
      replyTo: 'support@luxejewelry.com'
    });
    
    console.log('\n✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
  } catch (error) {
    console.error('\n✗ Email sending FAILED!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
  }
}

sendWelcomeEmail().then(() => process.exit(0));
