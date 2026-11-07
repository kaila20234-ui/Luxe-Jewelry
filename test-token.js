const jwt = require('jsonwebtoken');

// Test token from browser localStorage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTJhNDdjYWVlNjg2NjI5YjY1YTJhOTEiLCJlbWFpbCI6ImhhcHB0YXNhdHJhc0BnbWFpbC5jb20iLCJpYXQiOjE3MzI2NTEwMDAsImV4cCI6MTczMzI1NTgwMH0.test';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

try {
  // Decode without verification first
  const decoded = jwt.decode(token);
  console.log('Decoded (no verify):', decoded);
  
  // Try to verify
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    console.log('Verified:', verified);
  } catch (verifyErr) {
    console.log('Verification failed (expected):', verifyErr.message);
  }
} catch (err) {
  console.error('Error:', err.message);
}
