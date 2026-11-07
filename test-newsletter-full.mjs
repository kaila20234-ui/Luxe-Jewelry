#!/usr/bin/env node
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = process.env.JWT_SECRET;
const SMTP_USER = (process.env.SMTP_USER || '').trim();

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not set in .env');
  process.exit(1);
}

if (!SMTP_USER) {
  console.error('ERROR: SMTP_USER not set in .env');
  process.exit(1);
}

const adminToken = jwt.sign({ username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
console.log('✓ Admin token generated');

async function makeRequest(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payloadStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      timeout: 120000,  // Increased for slow Gmail SMTP responses
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr),
        Authorization: `Bearer ${adminToken}`,
        ...headers
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payloadStr);
    req.end();
  });
}

async function runTest() {
  try {
    console.log('\n=== Step 1: Fetch Subscribers ===');
    const subRes = await makeRequest('/api/subscribers', 'GET', {});
    const subscribers = JSON.parse(subRes.body);
    console.log(`Status: ${subRes.statusCode}`);
    console.log(`Subscribers found: ${subscribers.length}`);
    if (subscribers.length > 0) {
      console.log(`Sample: ${subscribers[0].email}`);
    }
    
    if (subscribers.length === 0) {
      console.log('\n=== Step 1b: Subscribe test email ===');
      const subPayload = { email: SMTP_USER };
      const subscribeRes = await makeRequest('/api/newsletter/subscribe', 'POST', subPayload);
      console.log(`Status: ${subscribeRes.statusCode}`);
      console.log(`Response: ${subscribeRes.body}`);
    }
    
    console.log('\n=== Step 2: Send Test Newsletter ===');
    const testPayload = {
      subject: 'Test Newsletter - ' + new Date().toISOString(),
      message: 'This is a test newsletter message from the automated test.\n\nIf you received this, the newsletter system is working correctly!',
      recipients: [SMTP_USER],
      includeStoreInfo: true
    };
    
    console.log(`Sending to: ${testPayload.recipients.join(', ')}`);
    const sendRes = await makeRequest('/api/newsletter/send', 'POST', testPayload);
    console.log(`Status: ${sendRes.statusCode}`);
    
    let response;
    try {
      response = JSON.parse(sendRes.body);
    } catch (e) {
      response = sendRes.body;
    }
    
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (sendRes.statusCode === 200) {
      console.log('\n✓✓✓ NEWSLETTER SEND SUCCESSFUL ✓✓✓');
    } else {
      console.log('\n✗✗✗ NEWSLETTER SEND FAILED ✗✗✗');
    }
    
  } catch (error) {
    console.error('Test Error:', error.message);
    process.exit(1);
  }
}

setTimeout(runTest, 2000);
