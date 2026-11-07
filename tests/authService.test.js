/**
 * Auth Service Tests
 */

const authService = require('../services/authService');

describe('Auth Service', () => {
  it('should export auth service', () => {
    expect(authService).toBeDefined();
  });

  it('should have auth functions', () => {
    expect(typeof authService.generateToken).toBe('function');
    expect(typeof authService.authenticate).toBe('function');
  });

  it('should generate valid tokens', () => {
    const token = authService.generateToken('user@test.com', 'admin');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
});
