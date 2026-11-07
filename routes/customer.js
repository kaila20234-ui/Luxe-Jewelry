// routes/customer.js - Customer profile and order management
const express = require('express');
const xss = require('xss');
const User = require('../model/user');
const Sale = require('../model/sales');
const AuditLog = require('../model/auditLog');
const { verifyCustomerToken } = require('./auth');

const router = express.Router();

// Apply auth middleware to all customer routes
router.use(verifyCustomerToken);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    console.log('[PROFILE] Fetching profile for userId:', req.userId);
    const user = await User.findById(req.userId);
    if (!user) {
      console.error('[PROFILE] User not found for userId:', req.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('[PROFILE] User found:', user.email);
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error('[PROFILE] Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Update user profile (PATCH - for backward compatibility)
router.patch('/profile', async (req, res) => {
  try {
    const xss = require('xss');
    const { name, phone, avatar, firstName, lastName, gender } = req.body;
    const updateData = {};

    if (name) updateData.name = xss(String(name || '').trim());
    if (firstName || lastName) {
      updateData.name = xss(`${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim());
    }
    if (phone) updateData.phone = xss(String(phone || '').trim());
    if (avatar) updateData.avatar = xss(String(avatar || '').trim());
    if (gender) updateData.gender = xss(String(gender || '').trim());

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('[PROFILE-UPDATE] Profile updated for userId:', req.userId);
    res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } });
  } catch (error) {
    console.error('[PROFILE-UPDATE] Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Update user profile (PUT - for profile settings page)
router.put('/profile', async (req, res) => {
  try {
    const xss = require('xss');
    const { firstName, lastName, phone, gender } = req.body;
    const updateData = {};

    if (firstName || lastName) {
      updateData.name = xss(`${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim());
    }
    if (phone) updateData.phone = xss(String(phone || '').trim());
    if (gender) updateData.gender = xss(String(gender || '').trim());

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('[PROFILE-UPDATE] Profile updated via PUT for userId:', req.userId);
    res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } });
  } catch (error) {
    console.error('[PROFILE-UPDATE] Error updating profile via PUT:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Get all addresses
router.get('/addresses', async (req, res) => {
  try {
    console.log('[ADDRESSES] Fetching addresses for userId:', req.userId);
    
    const user = await User.findById(req.userId);
    console.log('[ADDRESSES] User found:', !!user);
    
    if (!user) {
      console.error('[ADDRESSES] User not found for userId:', req.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('[ADDRESSES] Returning', user.addresses.length, 'addresses');
    res.json({ success: true, addresses: user.addresses, data: user.addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ success: false, message: 'Error fetching addresses' });
  }
});

// Add new address
router.post('/addresses', async (req, res) => {
  try {
    const xss = require('xss');
    const { label, street, city, state, zip, zipcode, country, isDefault } = req.body;

    if (!street || !city) {
      return res.status(400).json({ success: false, message: 'Street and city required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If marked as default, unset all others
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      label: xss(String(label || 'Home')),
      street: xss(String(street || '')),
      city: xss(String(city || '')),
      state: xss(String(state || '')),
      zip: xss(String(zip || zipcode || '')),
      zipcode: xss(String(zipcode || zip || '')),
      country: xss(String(country || '')),
      isDefault: Boolean(isDefault || false)
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added',
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ success: false, message: 'Error adding address' });
  }
});

// Update address (PATCH - for backward compatibility)
router.patch('/addresses/:addressId', async (req, res) => {
  try {
    const xss = require('xss');
    const { label, street, city, state, zip, zipcode, country, isDefault } = req.body;
    const { addressId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (label) address.label = xss(String(label));
    if (street) address.street = xss(String(street));
    if (city) address.city = xss(String(city));
    if (state) address.state = xss(String(state));
    if (zip) address.zip = xss(String(zip));
    if (zipcode) address.zipcode = xss(String(zipcode));
    if (country) address.country = xss(String(country));
    
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
      address.isDefault = true;
    }

    await user.save();
    res.json({ success: true, message: 'Address updated', addresses: user.addresses });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ success: false, message: 'Error updating address' });
  }
});

// Update address (PUT - for profile settings page)
router.put('/address', async (req, res) => {
  try {
    const xss = require('xss');
    const { street, city, state, zip, country } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update or create first address
    if (user.addresses.length > 0) {
      const address = user.addresses[0];
      if (street) address.street = xss(String(street));
      if (city) address.city = xss(String(city));
      if (state) address.state = xss(String(state));
      if (zip) address.zip = xss(String(zip));
      if (country) address.country = xss(String(country));
    } else {
      const newAddress = {
        label: 'Primary',
        street: xss(String(street || '')),
        city: xss(String(city || '')),
        state: xss(String(state || '')),
        zip: xss(String(zip || '')),
        country: xss(String(country || '')),
        isDefault: true
      };
      user.addresses.push(newAddress);
    }

    await user.save();
    console.log('[ADDRESS-UPDATE] Address updated via PUT for userId:', req.userId);
    res.json({ success: true, message: 'Address updated', data: { addresses: user.addresses } });
  } catch (error) {
    console.error('[ADDRESS-UPDATE] Error updating address via PUT:', error);
    res.status(500).json({ success: false, message: 'Error updating address' });
  }
});

// Delete address (original PATCH handler below)

// Delete address
router.delete('/addresses/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.addresses.id(addressId).remove();
    await user.save();
    res.json({ success: true, message: 'Address deleted', addresses: user.addresses });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ success: false, message: 'Error deleting address' });
  }
});

// Get user's order history
router.get('/orders', async (req, res) => {
  try {
    console.log('[ORDERS] Fetching orders for userId:', req.userId);
    
    // Get user profile to get email
    const user = await User.findById(req.userId);
    if (!user) {
      console.error('[ORDERS] User not found for userId:', req.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('[ORDERS] User email:', user.email);
    
    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const skip = (page - 1) * limit;

    // Find orders by userId OR by email (for legacy orders created before user registration)
    const filter = { $or: [{ userId: req.userId }, { email: user.email }] };
    const total = await Sale.countDocuments(filter);
    const sales = await Sale.find(filter).sort({ date: -1 }).skip(skip).limit(limit);

    console.log('[ORDERS] Found', sales.length, 'orders (page', page + ')');
    try { await AuditLog.create({ userId: req.userId, action: 'order_list', status: 'success', details: { page, limit, total }, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, orders: sales, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[ORDERS] Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.orderId);
    if (!sale || String(sale.userId) !== String(req.userId)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order: sale });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
});

// Get user's cart (mobile app endpoint)
router.get('/cart', async (req, res) => {
  try {
    console.log('[CART-GET] Fetching cart for userId:', req.userId);
    
    // Get user profile to get cart items
    const user = await User.findById(req.userId);
    if (!user) {
      console.error('[CART-GET] User not found for userId:', req.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('[CART-GET] User found:', user.email);
    console.log('[CART-GET] Current cart:', JSON.stringify(user.cart, null, 2));
    
    // Return cart items (stored in user document)
    const cartItems = user.cart || [];
    console.log('[CART-GET] Found', cartItems.length, 'items in cart');
    
    try { await AuditLog.create({ userId: req.userId, action: 'cart_view', status: 'success', details: { items: cartItems.length }, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, items: cartItems, cart: cartItems, data: cartItems });
  } catch (error) {
    console.error('[CART-GET] Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

// Add item to cart
router.post('/cart', async (req, res) => {
  try {
    console.log('[CART] POST request received');
    console.log('[CART] UserId:', req.userId);
    console.log('[CART] Body:', req.body);
    
    const { id, name, price, image, category, qty = 1 } = req.body;
    
    if (!id || !name || price === undefined) {
      console.error('[CART] Missing required fields:', { id, name, price });
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const user = await User.findById(req.userId);
    console.log('[CART] User found:', !!user, 'Email:', user?.email);
    
    if (!user) {
      console.error('[CART] User not found for userId:', req.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure cart array exists
    if (!Array.isArray(user.cart)) {
      console.log('[CART] Cart array not initialized, creating...');
      user.cart = [];
    }
    
    // Check if item already in cart
    const existingItem = user.cart.find(item => String(item.id || item._id) === String(id));
    console.log('[CART] Existing item found:', !!existingItem, 'Cart length:', user.cart.length);
    
    if (existingItem) {
      // Update quantity
      existingItem.qty = (existingItem.qty || 1) + Math.max(1, parseInt(qty) || 1);
      console.log('[CART] Updated quantity for item', id, 'to', existingItem.qty);
    } else {
      // Add new item
      const newItem = {
        id,
        name,
        price: Number(price),
        image: image || '',
        category: category || '',
        qty: Math.max(1, parseInt(qty) || 1),
        addedAt: new Date()
      };
      user.cart.push(newItem);
      console.log('[CART] Added new item to cart:', newItem);
    }
    
    console.log('[CART] Cart before save:', JSON.stringify(user.cart, null, 2));
    
    // Save user with new cart
    const savedUser = await user.save();
    
    console.log('[CART] User saved successfully');
    console.log('[CART] Cart after save:', JSON.stringify(savedUser.cart, null, 2));
    
    try { await AuditLog.create({ userId: req.userId, action: 'cart_add', status: 'success', details: { productId: id, qty }, ipAddress: req.ip }); } catch(e){}
    
    res.json({ success: true, message: 'Item added to cart', items: savedUser.cart });
  } catch (error) {
    console.error('[CART] Error adding to cart:', error.message);
    console.error('[CART] Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Error adding item to cart', error: error.message });
  }
});

// Update cart item quantity
router.put('/cart/:itemId', async (req, res) => {
  try {
    const { qty } = req.body;
    const { itemId } = req.params;
    
    if (qty === undefined || qty < 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure cart array exists
    if (!Array.isArray(user.cart)) {
      user.cart = [];
    }
    
    const cartItem = user.cart.find(item => {
      const cartId = String(item._id || item.id || '');
      const altId = String(item.id || item._id || '');
      return cartId === String(itemId) || altId === String(itemId);
    });
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }
    
    if (qty === 0) {
      // Remove item
      user.cart = user.cart.filter(item => {
        const cartId = String(item._id || item.id || '');
        const altId = String(item.id || item._id || '');
        return cartId !== String(itemId) && altId !== String(itemId);
      });
      console.log('[CART] Removed item from cart:', itemId);
    } else {
      // Update quantity
      cartItem.qty = qty;
      console.log('[CART] Updated item quantity:', itemId, 'to', qty);
    }
    
    await user.save();
    
    try { await AuditLog.create({ userId: req.userId, action: 'cart_update', status: 'success', details: { itemId, qty }, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, message: 'Cart updated', items: user.cart });
  } catch (error) {
    console.error('[CART] Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Error updating cart' });
  }
});

// Remove item from cart
router.delete('/cart/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure cart array exists
    if (!Array.isArray(user.cart)) {
      user.cart = [];
    }

    console.log('[CART-DELETE] Requested remove itemId:', itemId);
    console.log('[CART-DELETE] Current cart items ids:', user.cart.map(i => ({ id: i.id, _id: i._id, name: i.name })));

    const initialLength = user.cart.length;

    // Try robust matching: id, _id, nested product fields
    const matchedIndex = user.cart.findIndex(item => {
      const candidates = [];
      if (item.id) candidates.push(String(item.id));
      if (item._id) candidates.push(String(item._id));
      if (item.product && item.product.id) candidates.push(String(item.product.id));
      if (item.product && item.product._id) candidates.push(String(item.product._id));
      // also include item.id with and without ObjectId formatting
      return candidates.some(c => c === String(itemId));
    });

    if (matchedIndex === -1) {
      console.warn('[CART-DELETE] No exact match for itemId. Attempting loose match...');
      // Loose match: compare by substring (handles some malformed ids)
      const looseIndex = user.cart.findIndex(item => {
        const s = JSON.stringify(item);
        return s && s.indexOf(String(itemId)) !== -1;
      });
      if (looseIndex !== -1) {
        user.cart.splice(looseIndex, 1);
      }
    } else {
      user.cart.splice(matchedIndex, 1);
    }

    if (user.cart.length === initialLength) {
      console.error('[CART-DELETE] Failed to remove item - item not found after matching attempts for itemId:', itemId);
      return res.status(404).json({ success: false, message: 'Item not in cart', details: { requestedId: itemId, cartIds: user.cart.map(i => ({ id: i.id, _id: i._id })) } });
    }
    
    await user.save();
    console.log('[CART] Removed item from cart:', itemId);
    
    try { await AuditLog.create({ userId: req.userId, action: 'cart_remove', status: 'success', details: { itemId }, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, message: 'Item removed from cart', items: user.cart });
  } catch (error) {
    console.error('[CART] Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Error removing item from cart' });
  }
});

// Clear entire cart
router.delete('/cart', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.cart = [];
    await user.save();
    console.log('[CART] Cleared cart for userId:', req.userId);
    
    try { await AuditLog.create({ userId: req.userId, action: 'cart_clear', status: 'success', details: {}, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, message: 'Cart cleared', items: [] });
  } catch (error) {
    console.error('[CART] Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

module.exports = router;
