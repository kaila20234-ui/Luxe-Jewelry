/**
 * Payment Service Tests
 */

const paymentService = require('../services/paymentService');

describe('Payment Service', () => {
  it('should export payment service', () => {
    expect(paymentService).toBeDefined();
  });

  it('should have process functions', () => {
    expect(typeof paymentService.processSuccessfulPayment).toBe('function');
  });

  it('should have customer functions', () => {
    expect(typeof paymentService.createOrUpdateCustomer).toBe('function');
  });
});
