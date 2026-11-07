const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

// This is the test token from before
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTJhNDdjYWVlNjg2NjI5YjY1YTJhOTEiLCJlbWFpbCI6ImhhcHB0YXNhdHJhc0BnbWFpbC5jb20ifQ.test';

console.log('JWT_SECRET:', JWT_SECRET);
console.log('\nDecoding without verification:');
const decoded = jwt.decode(token);
console.log('Decoded:', JSON.stringify(decoded, null, 2));

console.log('\nTrying to verify:');
try {
  const verified = jwt.verify(token, JWT_SECRET);
  console.log('Verified:', JSON.stringify(verified, null, 2));
} catch (err) {
  console.log('Verification error:', err.message);
}
