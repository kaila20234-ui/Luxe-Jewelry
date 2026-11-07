#!/usr/bin/env node
/**
 * Test Cart API Endpoint
 * Manually tests adding items to cart
 */

const axios = require('axios');

const API_BASE = 'https://1mb0ksxv-5000.uks1.devtunnels.ms/api';

// Test user credentials
const testEmail = 'haptasatarast@gmail.com';
const testPassword = 'password123';

async function testCart() {
  try {
    console.log('[TEST] Starting cart API test...\n');

    // Step 1: Login
    console.log('[TEST] Step 1: Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    const token = loginRes.data.token;
    console.log('[TEST] ✓ Login successful');
    console.log('[TEST] Token:', token.substring(0, 20) + '...\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: Add item to cart
    console.log('[TEST] Step 2: Adding item to cart...');
    const addRes = await axios.post(`${API_BASE}/customer/cart`, {
      id: 'test-product-001',
      name: 'Test Diamond Ring',
      price: 299.99,
      image: 'https://example.com/ring.jpg',
      category: 'rings',
      qty: 1,
    }, { headers });

    console.log('[TEST] ✓ Item added successfully');
    console.log('[TEST] Response:', JSON.stringify(addRes.data, null, 2));
    console.log('[TEST] Items in cart:', addRes.data.items?.length || 0, '\n');

    // Step 3: Get cart
    console.log('[TEST] Step 3: Fetching cart...');
    const getRes = await axios.get(`${API_BASE}/customer/cart`, { headers });

    console.log('[TEST] ✓ Cart fetched successfully');
    console.log('[TEST] Response:', JSON.stringify(getRes.data, null, 2));
    console.log('[TEST] Items in cart:', getRes.data.items?.length || 0, '\n');

    if (getRes.data.items && getRes.data.items.length > 0) {
      console.log('[TEST] ✓✓✓ SUCCESS! Items are being saved to database!');
      console.log('[TEST] First item:', getRes.data.items[0]);
    } else {
      console.log('[TEST] ✗✗✗ PROBLEM! No items found in cart after adding!');
    }

  } catch (error) {
    console.error('[TEST] Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

await testCart();
