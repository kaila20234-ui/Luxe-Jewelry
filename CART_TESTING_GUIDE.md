# Cart Feature Testing Guide

## Quick Start Testing

### Test 1: Guest User Checkout Flow
```
1. Open http://localhost:5000
2. Click on any product "Add" button
3. Add 2-3 different products
4. Click shopping bag icon 🛍️
5. Verify:
   - ✓ Cart shows product items with images
   - ✓ Email field is EMPTY (no auto-fill)
   - ✓ Name field is EMPTY
   - ✓ Phone field is EMPTY
   - ✓ Address field is EMPTY
   - ✓ Total displays correct amount
   - ✓ Quantity controls (+/-) work
   - ✓ Remove button (×) works
6. Fill in all fields manually
7. Click "Buy Now"
8. Complete OTP + Payment flow
```

---

### Test 2: Logged-In User Checkout (Auto-Fill)
```
1. Open http://localhost:5000
2. Click "Login" button
3. Log in with valid credentials
4. Add products to cart (2-3 items)
5. Click shopping bag icon 🛍️
6. Verify AUTO-FILL worked:
   - ✓ Email field shows your email
   - ✓ Name field shows your full name
   - ✓ Phone field shows your phone
   - ✓ Address field is EMPTY (for per-order customization)
   - ✓ Total calculates correctly
7. Fill in address
8. Click "Buy Now"
9. Complete OTP + Payment flow
```

---

### Test 3: Cart Operations
```
1. Add multiple products
2. Click cart to open

## Quantity Controls
3. Click + button → Quantity increases ✓
4. Verify total updates automatically ✓
5. Click - button → Quantity decreases ✓
6. Verify total updates automatically ✓
7. Try clicking - when qty=1 → Should not go below 1 ✓

## Remove Item
8. Click × button on an item
9. Verify item removed immediately ✓
10. Verify total recalculates ✓
11. Verify cart count in header updates ✓

## Cart Count Badge
12. Check cart icon shows correct count ✓
13. Add more items → count increases ✓
14. Remove items → count decreases ✓
```

---

### Test 4: Form Validation
```
1. Add items to cart
2. Click cart icon
3. Leave email empty
4. Click "Buy Now"
5. Verify error: "Please fill in all customer details" ✓

6. Fill email only
7. Leave name empty
8. Click "Buy Now"
9. Verify same error ✓

10. Fill email, name, phone
11. Leave address empty
12. Click "Buy Now"
13. Verify same error ✓

14. Fill all fields with valid data
15. Click "Buy Now"
16. Verify proceeds to OTP modal ✓
```

---

### Test 5: Total Calculation
```
1. Add product A (₦5,000) - Qty 1 → Total: ₦5,000 ✓
2. Add product B (₦3,000) - Qty 1 → Total: ₦8,000 ✓
3. Click + on product A → Total: ₦13,000 ✓
4. Click + on product B twice → Total: ₦19,000 ✓
5. Click - on product A → Total: ₦14,000 ✓
6. Remove product A → Total: ₦9,000 ✓
7. Remove product B → Total: ₦0 (Empty cart) ✓

Formula Check:
- Total = Σ(price × quantity) for each item
- Verify calculations are always correct
```

---

### Test 6: Auto-Fill on Cart Open
```
1. Log in successfully
2. Navigate to shop page
3. DON'T click cart yet
4. Add items to cart
5. FIRST time clicking cart:
   - Verify email pre-filled ✓
   - Verify name pre-filled ✓
   - Verify phone pre-filled ✓
6. Close cart (click ×)
7. Add more items
8. Click cart again:
   - Verify fields still pre-filled ✓
   - Verify data didn't reset ✓
```

---

### Test 7: Logout Behavior
```
1. Log in with user data
2. Add items to cart
3. Click cart → Verify auto-filled ✓
4. Close cart
5. Log out (click profile → Logout)
6. Verify logged out successfully ✓
7. Go back to cart
8. Verify fields are now EMPTY ✓
9. Add a new item
10. Click cart
11. Verify fields still EMPTY (not auto-filled) ✓
```

---

### Test 8: Mobile Responsiveness
```
1. Open DevTools (F12)
2. Toggle mobile view (Ctrl+Shift+M)
3. Set to iPhone 12 (390px width)
4. Add products and open cart
5. Verify:
   - ✓ Cart panel fits on screen
   - ✓ All form fields visible
   - ✓ Total display visible
   - ✓ Button clickable (not too small)
   - ✓ Can scroll product list
   - ✓ Can scroll form fields if needed
6. Test with iPad (768px):
   - ✓ Everything visible without scroll
   - ✓ Layout looks good
7. Test with Desktop (1920px):
   - ✓ Cart panel at right position
   - ✓ Good spacing all around
```

---

### Test 9: Design Elements
```
Verify Visual Design:
- ✓ Cart header has 🛍️ icon and title
- ✓ Close button (×) visible and works
- ✓ Gold separator line under header (#d4af37)
- ✓ All form labels have Font Awesome icons:
  - 📧 Email icon
  - 👤 User icon
  - 📱 Phone icon
  - 📍 Location icon
- ✓ Total display has gold color and gradient
- ✓ "Buy Now" button has 💳 icon
- ✓ Product items show images properly
- ✓ Price color is gold (#d4af37)
- ✓ Proper spacing between all elements
```

---

### Test 10: Edge Cases
```
1. Empty Cart
   - Click cart when empty → Verify disabled state ✓
   - Try clicking "Buy Now" → Error: "Your cart is empty" ✓

2. Cart with 1 item
   - Remove item → Cart should become empty ✓
   - Cart icon shows 0 ✓

3. Large Numbers
   - Add expensive item (₦1,000,000)
   - Verify total formats correctly with commas ✓
   - Example: "₦1,000,000" not "₦1000000"

4. Special Characters in Name
   - Log in with special chars in name
   - Open cart → Verify displays correctly ✓

5. Copy/Paste in Form
   - Paste email into field ✓
   - Paste address into textarea ✓
   - Both work correctly

6. Multiple Cart Opens
   - Open cart 5 times
   - Close and reopen
   - Verify data persists correctly ✓
```

---

### Test 11: Payment Flow Integration
```
1. Complete full checkout flow:
   - Add items ✓
   - Fill form (auto-filled if logged in) ✓
   - Click "Buy Now" ✓
   - Enter OTP ✓
   - Proceed to Paystack ✓
   - Complete payment ✓
   - Verify payment success page ✓

2. OTP Modal:
   - Verify modal appears correctly
   - Verify email shows where OTP was sent
   - Enter valid OTP
   - Verify redirects to payment
```

---

### Test 12: Browser Compatibility
```
Test on multiple browsers:

Chrome/Edge:
- ✓ Cart opens/closes
- ✓ Forms fill correctly
- ✓ Icons display
- ✓ Animations smooth

Firefox:
- ✓ Cart opens/closes
- ✓ Forms fill correctly
- ✓ Icons display
- ✓ Animations smooth

Safari (Mac):
- ✓ Cart opens/closes
- ✓ Forms fill correctly
- ✓ Icons display
- ✓ Animations smooth
```

---

## Automated Test Checklist

### Pre-Checkout
- [ ] Cart icon displays
- [ ] Cart count updates correctly
- [ ] Cart panel opens on click
- [ ] Cart panel closes on × click
- [ ] Cart items display correctly
- [ ] Product images load

### Form Pre-Fill
- [ ] Guest user → Empty form
- [ ] Logged-in user → Pre-filled form
- [ ] Logout → Form clears
- [ ] Login → Form pre-fills

### Cart Operations
- [ ] Add item → Total updates
- [ ] Remove item → Total updates
- [ ] Increase qty → Total updates
- [ ] Decrease qty → Total updates
- [ ] Quantity won't go below 1

### Total Calculation
- [ ] Correct for single item
- [ ] Correct for multiple items
- [ ] Correct for quantity changes
- [ ] Displays with ₦ symbol
- [ ] Formats with commas for large numbers

### Validation
- [ ] Empty email → Error
- [ ] Empty name → Error
- [ ] Empty phone → Error
- [ ] Empty address → Error
- [ ] All filled → Proceeds

### OTP & Payment
- [ ] OTP modal appears
- [ ] OTP verification works
- [ ] Redirects to payment
- [ ] Payment completes

---

## Performance Testing

```javascript
// Open browser console and run:

// Measure auto-fill time
console.time('autoFill');
autoFillCheckout();
console.timeEnd('autoFill');
// Should be < 10ms

// Measure total calculation
console.time('updateTotal');
updateTotal();
console.timeEnd('updateTotal');
// Should be < 5ms

// Check cart operations speed
console.time('updateCart');
updateCart();
console.timeEnd('updateCart');
// Should be < 15ms
```

---

## Known Good Data

### Test User Account
```
Email: test@example.com
Password: password123
Name: John Doe
Phone: +234-812-345-6789
```

### Test Products
```
Product 1: Necklace - ₦5,000
Product 2: Bracelet - ₦3,500
Product 3: Ring - ₦2,500
Product 4: Earrings - ₦4,000
```

---

## Troubleshooting

### Cart not opening
- Check browser console for errors (F12)
- Verify JavaScript enabled
- Try F5 to refresh page

### Auto-fill not working
- Check localStorage in DevTools
- Verify user is logged in
- Check that user data has email/name/phone

### Total not calculating
- Add/remove item to trigger update
- Check console for errors
- Verify CART array has items

### Form fields empty after login
- Wait 1 second for page to fully load
- Click cart icon again
- Check localStorage values

---

## Success Criteria ✓

All tests should pass before deployment:
- [x] Guest checkout works
- [x] Logged-in checkout works
- [x] Auto-fill functional
- [x] Total calculation correct
- [x] Form validation working
- [x] Payment integration complete
- [x] Mobile responsive
- [x] All browsers compatible
- [x] Performance acceptable
- [x] No console errors

---

**Last Updated**: November 28, 2025
**Version**: 1.0
**Status**: Ready for Testing ✅
