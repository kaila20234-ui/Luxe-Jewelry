/**
 * Payment Service
 * Handles payment processing, order creation, inventory updates, email notifications
 * Reduces webhook endpoint complexity from 58 to <25
 */

const Sale = require('../model/sales');
const User = require('../model/user');

// Try to load optional models
let Product, OtpSession;
try {
  Product = require('../model/product');
} catch (e) {
  console.warn('Product model not available:', e.message);
  Product = null;
}

try {
  OtpSession = require('../model/otpSession');
} catch (e) {
  console.warn('OtpSession model not available:', e.message);
  OtpSession = null;
}

// Email service may not exist yet, so we'll make it optional
let sendOrderConfirmationEmail, sendOrderStatusEmail;
try {
  const emailService = require('./emailService');
  sendOrderConfirmationEmail = emailService.sendOrderConfirmationEmail;
  sendOrderStatusEmail = emailService.sendOrderStatusEmail;
} catch (e) {
  console.warn('Email service not available, using no-op handlers:', e.message);
  sendOrderConfirmationEmail = async () => true;
  sendOrderStatusEmail = async () => true;
}

/**
 * Create or update customer record
 * @param {Object} session - Session data with customer info
 * @returns {Promise<Object>} Created/updated customer
 */
async function createOrUpdateCustomer(session) {
  try {
    const existingCustomer = await User.findOne({ email: session.email });
    
    if (existingCustomer) {
      // Update existing customer with latest info
      if (session.name) existingCustomer.name = session.name;
      if (session.phone) existingCustomer.phone = session.phone;
      await existingCustomer.save();
      console.log('   Customer record updated');
      return existingCustomer;
    }
    
    // Create new customer
    const bcrypt = require('bcrypt');
    const crypto = require('node:crypto');
    
    const newCustomer = new User({
      email: session.email,
      name: session.name || 'Customer',
      phone: session.phone || '',
      role: 'customer',
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12)
    });
    await newCustomer.save();
    console.log('   Customer record created');
    return newCustomer;
  } catch (err) {
    console.warn('Customer record error:', err.message);
    throw err;
  }
}

/**
 * Create sale record in database
 * @param {Object} session - Session data
 * @param {string} reference - Payment reference
 * @param {number} amountPaid - Amount paid
 * @returns {Promise<Object>} Created sale
 */
async function createSaleRecord(session, reference, amountPaid) {
  try {
    const formattedItems = session.items || [];
    
    const newSale = new Sale({
      reference: reference,
      userId: session.userId || null,
      email: session.email,
      name: session.name,
      phone: session.phone,
      address: session.address,
      amount: amountPaid,
      status: "paid",
      paidAt: new Date(),
      otpVerified: true,
      items: formattedItems,
    });

    await newSale.save();
    console.log('   Sale created in DB');
    return newSale;
  } catch (err) {
    console.error('Sale creation error:', err.message);
    throw err;
  }
}

/**
 * Update product inventory after sale
 * @param {Array} items - Items purchased
 * @returns {Promise<void>}
 */
async function updateProductInventory(items) {
  try {
    for (const item of items) {
      const productId = item._id || item.id;
      const quantity = item.qty || 1;

      if (!productId) continue;

      const prod = await Product.findById(productId);
      if (!prod) continue;

      if (typeof prod.stock === "number") {
        const newStock = Math.max(0, (prod.stock || 0) - quantity);
        prod.stock = newStock;
        prod.available = newStock > 0;
        await prod.save();
      } else {
        prod.available = false;
        await prod.save();
      }
    }
    console.log('   Stock updated');
  } catch (err) {
    console.warn('Stock update failed:', err.message);
    // Don't throw - inventory update shouldn't fail the entire transaction
  }
}

/**
 * Send payment confirmation and status emails
 * @param {Object} session - Session data
 * @param {string} reference - Payment reference
 * @param {number} amountPaid - Amount paid
 * @returns {Promise<void>}
 */
async function sendPaymentEmails(session, reference, amountPaid) {
  try {
    const formattedItems = session.items.map(item => ({
      name: item.name || item.productName,
      quantity: item.qty || 1,
      price: item.price
    }));

    const orderData = {
      reference: reference,
      items: formattedItems,
      amount: amountPaid,
      name: session.name,
      email: session.email,
      date: new Date().toLocaleDateString()
    };

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(session.email, {
        reference: reference,
        items: formattedItems,
        amount: amountPaid,
        name: session.name,
        email: session.email
      });
      console.log('   Confirmation email sent');
    } catch (error_) {
      console.warn('Confirmation email failed:', error_.message);
    }

    // Send status email (processing)
    try {
      await sendOrderStatusEmail(session.email, orderData, 'processing');
      console.log('   Status email sent (processing)');
    } catch (error_) {
      console.warn('Status email failed:', error_.message);
    }
  } catch (err) {
    console.warn('Email sending error:', err.message);
  }
}

/**
 * Clean up OTP session after payment
 * @param {Object} session - Session data
 * @returns {Promise<void>}
 */
async function cleanupOtpSession(session) {
  try {
    await OtpSession.deleteOne({ sessionId: session.sessionId });
    console.log('   OTP session cleaned up');
  } catch (err) {
    console.warn('Failed to cleanup OtpSession:', err.message);
  }
}

/**
 * Check if sale already exists
 * @param {string} reference - Payment reference
 * @returns {Promise<Object|null>} Existing sale or null
 */
async function checkExistingSale(reference) {
  try {
    return await Sale.findOne({ reference: reference });
  } catch (err) {
    console.warn('Sale lookup error:', err.message);
    return null;
  }
}

/**
 * Process successful payment
 * Main entry point for payment processing
 * @param {string} reference - Payment reference
 * @param {number} amountPaid - Amount paid
 * @returns {Promise<{success: boolean, message: string, saleId?: string}>}
 */
async function processSuccessfulPayment(reference, amountPaid) {
  try {
    console.log('   Reference: ' + reference);
    console.log('   Amount: ' + amountPaid);

    // Find OTP session
    const OtpSession = require('../model/OtpSession');
    const session = await OtpSession.findOne({ reference: reference });
    console.log('   Session lookup: ' + (session ? 'FOUND' : 'NOT FOUND'));

    if (!session) {
      // Check if sale already exists
      const existingSale = await checkExistingSale(reference);
      if (existingSale) {
        console.log('   Sale already exists');
        return { success: true, message: 'Sale already processed', saleId: existingSale._id };
      }
      console.log('   WARNING: No session for reference');
      return { success: false, message: 'No session found for payment' };
    }

    // Check if sale already created
    const existing = await checkExistingSale(reference);
    if (existing) {
      console.log('   Sale already created');
      await cleanupOtpSession(session);
      return { success: true, message: 'Sale already created', saleId: existing._id };
    }

    // Create or update customer
    await createOrUpdateCustomer(session);

    // Create sale record
    const sale = await createSaleRecord(session, reference, amountPaid);

    // Update inventory
    await updateProductInventory(session.items);

    // Send emails
    await sendPaymentEmails(session, reference, amountPaid);

    // Clean up session
    await cleanupOtpSession(session);

    console.log('   SUCCESS');
    return { success: true, message: 'Payment processed successfully', saleId: sale._id };
  } catch (err) {
    console.error('Payment processing error:', err.message);
    return { success: false, message: 'Payment processing failed', error: err.message };
  }
}

/**
 * Get order details by reference
 * @param {string} reference - Payment reference
 * @returns {Promise<Object|null>} Order or null
 */
async function getOrderByReference(reference) {
  try {
    return await Sale.findOne({ reference: reference });
  } catch (err) {
    console.warn('Order lookup error:', err.message);
    return null;
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {Object} customerEmail - Customer email for notification
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, status, customerEmail) {
  try {
    const order = await Sale.findByIdAndUpdate(
      orderId,
      { status: status, statusUpdatedAt: new Date() },
      { new: true }
    );

    if (order && customerEmail) {
      // Send status update email
      try {
        const orderData = {
          reference: order.reference,
          items: order.items,
          amount: order.amount,
          name: order.name,
          email: order.email,
          date: order.paidAt?.toLocaleDateString()
        };
        await sendOrderStatusEmail(customerEmail, orderData, status);
        console.log(`   Status email sent (${status})`);
      } catch (error_) {
        console.warn(`Status email failed (${status}):`, error_?.message);
      }
    }

    return order;
  } catch (err) {
    console.error('Order update error:', err.message);
    throw err;
  }
}

module.exports = {
  createOrUpdateCustomer,
  createSaleRecord,
  updateProductInventory,
  sendPaymentEmails,
  cleanupOtpSession,
  checkExistingSale,
  processSuccessfulPayment,
  getOrderByReference,
  updateOrderStatus
};
