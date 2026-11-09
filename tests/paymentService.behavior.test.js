jest.mock('../model/sales', () => {
  const Sale = jest.fn(function createSale(data) {
    Object.assign(this, data);
    this._id = 'sale-id';
    this.save = jest.fn().mockResolvedValue(this);
  });
  Sale.findOne = jest.fn();
  Sale.findByIdAndUpdate = jest.fn();
  return Sale;
});

jest.mock('../model/user', () => {
  const User = jest.fn(function createUser(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  User.findOne = jest.fn();
  return User;
});

jest.mock('../model/product', () => ({
  findById: jest.fn()
}), { virtual: true });

jest.mock('../model/otpSession', () => ({
  deleteOne: jest.fn()
}), { virtual: true });

jest.mock('../model/OtpSession', () => ({
  findOne: jest.fn()
}), { virtual: true });

jest.mock('../services/emailService', () => ({
  sendOrderConfirmationEmail: jest.fn(),
  sendOrderStatusEmail: jest.fn()
}), { virtual: true });

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('generated-hash')
}));

const Sale = require('../model/sales');
const User = require('../model/user');
const Product = require('../model/product');
const OtpSession = require('../model/otpSession');
const PaymentOtpSession = require('../model/OtpSession');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');

describe('Payment service behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates existing customer data and creates a new customer with a hashed password', async () => {
    const existing = { email: 'customer@example.com', save: jest.fn().mockResolvedValue(true) };
    User.findOne.mockResolvedValueOnce(existing);
    await expect(paymentService.createOrUpdateCustomer({
      email: existing.email,
      name: 'Updated',
      phone: '123'
    })).resolves.toBe(existing);
    expect(existing).toMatchObject({ name: 'Updated', phone: '123' });
    expect(existing.save).toHaveBeenCalled();

    User.findOne.mockResolvedValueOnce(null);
    const created = await paymentService.createOrUpdateCustomer({ email: 'new@example.com' });
    expect(created).toMatchObject({
      email: 'new@example.com',
      name: 'Customer',
      phone: '',
      role: 'customer',
      password: 'generated-hash'
    });
    expect(created.save).toHaveBeenCalled();

    User.findOne.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(paymentService.createOrUpdateCustomer({ email: 'fail@example.com' }))
      .rejects.toThrow('database unavailable');
  });

  it('creates paid sale records and propagates save failures', async () => {
    const session = {
      userId: 'user-id',
      email: 'customer@example.com',
      name: 'Customer',
      phone: '123',
      address: 'Street',
      items: [{ id: 'product-id', qty: 2 }]
    };
    const sale = await paymentService.createSaleRecord(session, 'reference', 2500);
    expect(sale).toMatchObject({
      reference: 'reference',
      userId: 'user-id',
      email: session.email,
      amount: 2500,
      status: 'paid',
      otpVerified: true,
      items: session.items
    });
    expect(sale.save).toHaveBeenCalled();

    Sale.mockImplementationOnce(function failingSale() {
      this.save = jest.fn().mockRejectedValue(new Error('save failed'));
    });
    await expect(paymentService.createSaleRecord(session, 'failed', 1)).rejects.toThrow('save failed');
  });

  it('updates stock, marks depleted inventory unavailable, skips missing products, and contains errors', async () => {
    const inStock = { stock: 5, save: jest.fn().mockResolvedValue(true) };
    const depleted = { stock: 1, save: jest.fn().mockResolvedValue(true) };
    const legacy = { available: true, save: jest.fn().mockResolvedValue(true) };
    Product.findById
      .mockResolvedValueOnce(inStock)
      .mockResolvedValueOnce(depleted)
      .mockResolvedValueOnce(legacy)
      .mockResolvedValueOnce(null);

    await paymentService.updateProductInventory([
      { _id: 'first', qty: 2 },
      { id: 'second', qty: 3 },
      { id: 'legacy' },
      { id: 'missing' },
      {}
    ]);

    expect(inStock).toMatchObject({ stock: 3, available: true });
    expect(depleted).toMatchObject({ stock: 0, available: false });
    expect(legacy.available).toBe(false);
    expect(Product.findById).toHaveBeenCalledTimes(4);

    Product.findById.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(paymentService.updateProductInventory([{ id: 'error' }])).resolves.toBeUndefined();
  });

  it('sends confirmation and status emails and contains individual and formatting failures', async () => {
    const session = {
      email: 'customer@example.com',
      name: 'Customer',
      items: [{ name: 'Ring', qty: 2, price: 100 }, { productName: 'Chain', price: 50 }]
    };
    await paymentService.sendPaymentEmails(session, 'reference', 250);
    expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(
      session.email,
      expect.objectContaining({
        reference: 'reference',
        items: [
          { name: 'Ring', quantity: 2, price: 100 },
          { name: 'Chain', quantity: 1, price: 50 }
        ]
      })
    );
    expect(emailService.sendOrderStatusEmail).toHaveBeenCalledWith(
      session.email,
      expect.objectContaining({ reference: 'reference' }),
      'processing'
    );

    emailService.sendOrderConfirmationEmail.mockRejectedValueOnce(new Error('email failed'));
    emailService.sendOrderStatusEmail.mockRejectedValueOnce(new Error('status failed'));
    await expect(paymentService.sendPaymentEmails(session, 'reference', 250)).resolves.toBeUndefined();
    await expect(paymentService.sendPaymentEmails({ email: session.email }, 'reference', 250))
      .resolves.toBeUndefined();
  });

  it('cleans up OTP sessions and treats cleanup errors as non-fatal', async () => {
    OtpSession.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    await paymentService.cleanupOtpSession({ sessionId: 'session-id' });
    expect(OtpSession.deleteOne).toHaveBeenCalledWith({ sessionId: 'session-id' });

    OtpSession.deleteOne.mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(paymentService.cleanupOtpSession({ sessionId: 'session-id' })).resolves.toBeUndefined();
  });

  it('looks up existing sales and returns null on database errors', async () => {
    const sale = { _id: 'sale-id' };
    Sale.findOne.mockResolvedValueOnce(sale);
    await expect(paymentService.checkExistingSale('reference')).resolves.toBe(sale);
    Sale.findOne.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(paymentService.checkExistingSale('reference')).resolves.toBeNull();
  });

  it('processes new payments, cleans duplicate sessions, and handles missing sessions', async () => {
    const session = {
      reference: 'reference',
      sessionId: 'session-id',
      email: 'customer@example.com',
      name: 'Customer',
      items: []
    };

    PaymentOtpSession.findOne.mockResolvedValueOnce(null);
    Sale.findOne.mockResolvedValueOnce({ _id: 'existing-id' });
    await expect(paymentService.processSuccessfulPayment('reference', 100)).resolves.toMatchObject({
      success: true,
      message: 'Sale already processed',
      saleId: 'existing-id'
    });

    PaymentOtpSession.findOne.mockResolvedValueOnce(null);
    Sale.findOne.mockResolvedValueOnce(null);
    await expect(paymentService.processSuccessfulPayment('missing', 100)).resolves.toMatchObject({
      success: false,
      message: 'No session found for payment'
    });

    PaymentOtpSession.findOne.mockResolvedValueOnce(session);
    Sale.findOne.mockResolvedValueOnce({ _id: 'existing-id' });
    OtpSession.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    await expect(paymentService.processSuccessfulPayment('reference', 100)).resolves.toMatchObject({
      success: true,
      message: 'Sale already created',
      saleId: 'existing-id'
    });

    PaymentOtpSession.findOne.mockResolvedValueOnce(session);
    Sale.findOne.mockResolvedValueOnce(null);
    User.findOne.mockResolvedValueOnce({
      email: session.email,
      save: jest.fn().mockResolvedValue(true)
    });
    Product.findById.mockResolvedValueOnce({ stock: 2, save: jest.fn().mockResolvedValue(true) });
    OtpSession.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    const processed = await paymentService.processSuccessfulPayment('reference', 100);
    expect(processed).toMatchObject({
      success: true,
      message: 'Payment processed successfully',
      saleId: 'sale-id'
    });
    expect(Sale.findByIdAndUpdate).not.toHaveBeenCalled();

    PaymentOtpSession.findOne.mockRejectedValueOnce(new Error('session lookup failed'));
    await expect(paymentService.processSuccessfulPayment('error', 100)).resolves.toMatchObject({
      success: false,
      message: 'Payment processing failed',
      error: 'session lookup failed'
    });
  });

  it('retrieves orders and returns null when lookup fails', async () => {
    const order = { reference: 'reference' };
    Sale.findOne.mockResolvedValueOnce(order);
    await expect(paymentService.getOrderByReference('reference')).resolves.toBe(order);
    Sale.findOne.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(paymentService.getOrderByReference('reference')).resolves.toBeNull();
  });

  it('updates order status and handles missing orders, email failures, and database errors', async () => {
    const order = {
      reference: 'reference',
      items: [],
      amount: 100,
      name: 'Customer',
      email: 'customer@example.com',
      paidAt: new Date()
    };
    Sale.findByIdAndUpdate.mockResolvedValueOnce(order);
    await expect(
      paymentService.updateOrderStatus('sale-id', 'shipped', order.email)
    ).resolves.toBe(order);
    expect(emailService.sendOrderStatusEmail).toHaveBeenCalledWith(
      order.email,
      expect.objectContaining({ reference: 'reference' }),
      'shipped'
    );

    Sale.findByIdAndUpdate.mockResolvedValueOnce(null);
    await expect(paymentService.updateOrderStatus('missing', 'shipped', order.email)).resolves.toBeNull();

    Sale.findByIdAndUpdate.mockResolvedValueOnce(order);
    emailService.sendOrderStatusEmail.mockRejectedValueOnce(new Error('email failed'));
    await expect(paymentService.updateOrderStatus('sale-id', 'shipped', order.email)).resolves.toBe(order);

    Sale.findByIdAndUpdate.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(paymentService.updateOrderStatus('sale-id', 'shipped')).rejects.toThrow(
      'database unavailable'
    );
  });
});
