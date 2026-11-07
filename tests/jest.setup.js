/**
 * Jest Setup Configuration
 * Configures test environment and global settings
 */

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-min-32-characters-long!';
process.env.MONGO_URI = 'mongodb://localhost:27017/luxe_jewelry_test';

// Suppress console logs during tests
globalThis.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toBeValidToken(received) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(received, process.env.JWT_SECRET);
      return {
        message: () => `expected ${received} not to be a valid token`,
        pass: true
      };
    } catch (e) {
      return {
        message: () => `expected ${received} to be a valid token but got ${e.message}`,
        pass: false
      };
    }
  }
});

// Set test timeout to 10 seconds
jest.setTimeout(10000);
