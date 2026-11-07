# 🎫 Coupon System - Quick Start Guide

## 🚀 Getting Started

### 1. Start Your Server
```powershell
npm start
# or
npm run dev
```

Server runs on: `http://localhost:5000`

---

## 📋 Testing the Coupon System

### Step 1: Access Admin Panel
1. Open browser: `http://localhost:5000/public/admin_coupons.html`
2. Click **"Create Coupon"** button

### Step 2: Create a Test Coupon

**Example 1: Percentage Discount**
```
Code:              SUMMER2025
Description:       20% off entire store
Discount Type:     Percentage (%)
Discount Value:    20
Max Discount:      10000
Min Purchase:      25000
Usage Limit:       100
Per User Limit:    1
Status:            Active
```

**Example 2: Fixed Discount**
```
Code:              WELCOME100
Description:       ₦100 off first order
Discount Type:     Fixed Amount (₦)
Discount Value:    100
Min Purchase:      500
Usage Limit:       Unlimited
Per User Limit:    1
Status:            Active
```

**Example 3: High-Value Promo**
```
Code:              VIP5000
Description:       ₦5000 premium discount
Discount Type:     Fixed Amount (₦)
Discount Value:    5000
Min Purchase:      50000
Usage Limit:       50
Per User Limit:    2
Status:            Active
```

### Step 3: Test Coupon Application

#### Via API (cURL)
```bash
# Validate coupon
curl -X POST http://localhost:5000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2025",
    "cartTotal": 50000,
    "items": [{"productId": "prod_1", "category": "rings"}]
  }'

# Expected Response:
{
  "success": true,
  "discount": 10000,
  "finalTotal": 40000,
  "message": "Coupon applied! You saved ₦10000.00"
}
```

#### Via Frontend
1. Add items to cart (from `/shop-all.html`)
2. Go to checkout page
3. Look for coupon input field
4. Enter code: `SUMMER2025`
5. Click "Apply Coupon"
6. See discount applied to total

---

## ✅ Validation Test Cases

### Test 1: Valid Coupon
**Input:** 
- Code: `SUMMER2025` (created above)
- Cart Total: ₦50,000
- Expected: Discount ₦10,000 (20% max cap ₦10,000)

**Pass Criteria:** Discount applied, final total = ₦40,000

### Test 2: Insufficient Minimum Purchase
**Input:**
- Code: `SUMMER2025`
- Cart Total: ₦10,000
- Expected: Error message

**Pass Criteria:** Error: "Minimum purchase of ₦25,000 required"

### Test 3: Expired Coupon
**Input:**
- Code: Coupon with past end date
- Expected: Error message

**Pass Criteria:** Error: "This coupon has expired"

### Test 4: Usage Limit Exceeded
**Input:**
- Code: `WELCOME100` (usage limit = 1)
- Already used once
- Expected: Error message

**Pass Criteria:** Error: "This coupon has reached its usage limit"

### Test 5: Invalid Code
**Input:**
- Code: `INVALID999`
- Expected: Error

**Pass Criteria:** Error: "Coupon code not found"

### Test 6: Discount Cap Applied
**Input:**
- Code: `SUMMER2025` (20% with ₦10,000 max)
- Cart Total: ₦100,000
- Expected: Discount = ₦10,000 (not ₦20,000)

**Pass Criteria:** Discount capped at ₦10,000

### Test 7: Fixed Discount (No Cap)
**Input:**
- Code: `WELCOME100` (fixed ₦100)
- Cart Total: ₦1,000
- Expected: Discount = ₦100

**Pass Criteria:** Discount = ₦100

---

## 🔧 Database Testing

### Check Coupon Created in MongoDB

```javascript
// In MongoDB shell or GUI:
db.coupons.findOne({ code: "SUMMER2025" })

// Expected output:
{
  "_id": ObjectId(...),
  "code": "SUMMER2025",
  "description": "20% off entire store",
  "discountType": "percentage",
  "discountValue": 20,
  "maxDiscount": 10000,
  "minPurchase": 25000,
  "isActive": true,
  "usageLimit": 100,
  "usageCount": 0,
  "startDate": ISODate("2025-12-02T00:00:00.000Z"),
  "usedBy": []
}
```

### Check Usage Tracking
```javascript
// After coupon used:
db.coupons.findOne({ code: "SUMMER2025" })

// Should show:
{
  ...,
  "usageCount": 1,
  "usedBy": [{
    "_id": ObjectId(...),
    "userId": ObjectId("user_id"),
    "usageDate": ISODate("2025-12-02T..."),
    "orderReference": "PAY_12345"
  }]
}
```

---

## 🎯 Admin Panel Testing

### Create Coupon in UI
1. Click **Create Coupon** button
2. Fill all required fields
3. Click **Save Coupon**
4. See success message
5. Coupon appears in table below

### Edit Coupon
1. Find coupon in table
2. Click **Edit** button
3. Modify fields
4. Click **Save Coupon**
5. Verify changes applied

### Delete Coupon
1. Find coupon in table
2. Click **Delete** button
3. Confirm deletion
4. Coupon removed from table

### View Coupon Details
- Code (uppercase)
- Discount (% or ₦)
- Min Purchase
- Used/Limit ratio
- Active/Inactive status

---

## 🐛 Troubleshooting

### Issue: Coupon code not found
**Solution:** 
- Verify code exists in admin panel
- Code is case-insensitive but stored uppercase
- Check if coupon is active (isActive: true)

### Issue: Discount not calculating
**Solution:**
- Check discount type (percentage vs fixed)
- Verify max discount cap if using percentage
- Check if cart total exceeds minimum purchase
- Ensure dates are within validity period

### Issue: Usage limit not enforcing
**Solution:**
- Check usageLimit value (null = unlimited)
- Check perUserLimit for user-specific limits
- Verify database usageCount is updating

### Issue: Cart not updating
**Solution:**
- Verify HTML has data attributes:
  - `data-cart-total`
  - `data-final-total`
  - `data-discount-amount`
- Check console for JavaScript errors
- Verify coupon-manager.js is loaded

### Issue: API not responding
**Solution:**
- Ensure server is running (`npm start`)
- Check API URL is correct: `http://localhost:5000`
- Verify CORS is enabled in server.js
- Check for typos in endpoint URLs

---

## 📊 Analytics to Track

### Key Metrics
- **Coupon Redemption Rate:** `(usageCount / issueCount) × 100`
- **Average Discount:** Sum of all discounts / number of uses
- **Cart Recovery Rate:** Coupons offered vs applied
- **Revenue Impact:** Lost revenue vs increased volume

### Query Examples
```javascript
// Total coupons created
db.coupons.countDocuments({ })

// Active coupons
db.coupons.countDocuments({ isActive: true })

// Total used coupons
db.coupons.aggregate([
  { $group: { _id: null, total: { $sum: "$usageCount" } } }
])

// Most popular coupons
db.coupons.find({})
  .sort({ usageCount: -1 })
  .limit(5)

// Revenue from coupons (requires sales collection)
db.sales.aggregate([
  { $match: { couponCode: { $exists: true } } },
  { $group: { _id: null, totalDiscount: { $sum: "$discountAmount" } } }
])
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Test all coupon types (percentage, fixed)
- [ ] Test discount caps
- [ ] Test expiration dates
- [ ] Test usage limits
- [ ] Test per-user limits
- [ ] Test min purchase requirement
- [ ] Test on mobile devices
- [ ] Test admin panel CRUD
- [ ] Verify database indexes
- [ ] Test error messages
- [ ] Load test (many coupons)
- [ ] Monitor error logs
- [ ] Set up analytics tracking
- [ ] Train admin team
- [ ] Create promotional coupons
- [ ] Announce to customers

---

## 📞 API Reference

### Validate Coupon
```
POST /api/coupons/validate
Content-Type: application/json

{
  "code": "SUMMER2025",
  "cartTotal": 50000,
  "userId": "user_id",
  "userEmail": "user@email.com",
  "items": [
    {
      "productId": "prod_123",
      "category": "rings"
    }
  ]
}

Response:
{
  "success": true,
  "coupon": {
    "code": "SUMMER2025",
    "description": "20% off",
    "discountType": "percentage",
    "discountValue": 20,
    "maxDiscount": 10000
  },
  "discount": 10000,
  "finalTotal": 40000,
  "message": "Coupon applied! You saved ₦10000.00"
}
```

### Apply Coupon (Track Usage)
```
POST /api/coupons/apply
Content-Type: application/json

{
  "code": "SUMMER2025",
  "orderReference": "PAY_xyz123",
  "userId": "user_id",
  "discountAmount": 10000
}

Response:
{
  "success": true,
  "message": "Coupon applied to order successfully",
  "coupon": "SUMMER2025",
  "discountApplied": 10000
}
```

### Get Available Coupons
```
GET /api/coupons/available

Response:
{
  "success": true,
  "count": 3,
  "coupons": [
    {
      "code": "SUMMER2025",
      "description": "20% off entire store",
      "discountType": "percentage",
      "discountValue": 20,
      "minPurchase": 25000
    },
    ...
  ]
}
```

---

## ✨ Performance Tips

1. **Cache available coupons** on frontend (5-min TTL)
2. **Use database indexes** on `code` and `isActive`
3. **Validate on backend** only (never trust client validation)
4. **Batch apply coupons** if checking multiple (deprecated)
5. **Archive old coupons** after expiration

---

**Created:** December 2, 2025  
**Last Updated:** December 2, 2025  
**Status:** Ready for Testing ✅
