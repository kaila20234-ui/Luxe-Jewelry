// Direct SMTP test to verify credentials work for sending
const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 465;
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('Testing SMTP configuration:');
console.log('  Host:', SMTP_HOST);
console.log('  Port:', SMTP_PORT);
console.log('  User:', SMTP_USER);
console.log('  Pass length:', SMTP_PASS.length);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  requireTLS: true,
  authMethod: 'PLAIN',
  connectionTimeout: 30000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
  debug: true,
  logger: true,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function test() {
  try {
    console.log('\n✓ Sending test email...');
    const info = await transporter.sendMail({
      from: `Luxe Jewelry <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: 'Direct SMTP Test',
      text: 'This is a direct SMTP test email',
      html: '<p>This is a direct SMTP test email</p>',
      replyTo: 'support@luxejewelry.com',
    });

    console.log('\n✓✓✓ EMAIL SENT SUCCESSFULLY ✓✓✓');
    console.log('Message ID:', info.messageId);
    transporter.close();
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error('Details:', {
      code: error.code,
      response: error.response,
      command: error.command,
    });
    transporter.close();
    process.exit(1);
  }
}

test();
