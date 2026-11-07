# Testing Guide - Phase 2 Features

## 📋 Pre-Testing Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure .env File
```
NODE_ENV=development
ALLOW_DEV_ENDPOINTS=true
MONGO_URI=mongodb://localhost:27017/luxe_jewelry
JWT_SECRET=test-secret-key-min-32-characters-long!
PAYSTACK_SECRET_KEY=your-paystack-test-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
PORT=5000
```

### 3. Create Database Indexes
```bash
node scripts/migrate-indexes.js
```

### 4. Start Server
```bash
npm start
# OR
node server.js
```

Server should be running at `http://localhost:5000`

---

## 🧪 Test Suite 1: Input Validation

### Test 1.1: Login Endpoint Validation
**Endpoint**: `POST /api/login`

**Invalid Test - Empty Email**:
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":"password123"}'
```
✅ **Expected**: 400 error with validation message

**Invalid Test - Short Password**:
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123"}'
```
✅ **Expected**: 400 error (min 6 characters)

**Valid Test**:
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@luxejewelry.com","password":"password123"}'
```
✅ **Expected**: 200 with token

---

### Test 1.2: Newsletter Subscription Validation
**Endpoint**: `POST /api/newsletter/subscribe`

**Invalid Test - Invalid Email**:
```bash
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
```
✅ **Expected**: 400 error

**Valid Test**:
```bash
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```
✅ **Expected**: 200 with success message

---

### Test 1.3: OTP Request Validation
**Endpoint**: `POST /api/otp/request`

**Invalid Test - Missing Email**:
```bash
curl -X POST http://localhost:5000/api/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"08012345678","items":[],"total":0}'
```
✅ **Expected**: 400 error

**Valid Test**:
```bash
curl -X POST http://localhost:5000/api/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "email":"customer@example.com",
    "phone":"08012345678",
    "items":[{"id":"65f1a2b3","name":"Ring","price":50000,"qty":1}],
    "total":50000
  }'
```
✅ **Expected**: 200 with OTP session

---

## 🧪 Test Suite 2: Wishlist System

### Test 2.1: Add Product to Wishlist
**Endpoint**: `POST /api/wishlist`
**Auth**: Required ✅

First, get a valid token by logging in:
```bash
TOKEN=$(curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@luxejewelry.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Add to wishlist
curl -X POST http://localhost:5000/api/wishlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":"65f1a2b3c4d5e6f7g8h9i0j1"}'
```
✅ **Expected**: 200 with success message

**Test Duplicate**:
```bash
# Add same product again
curl -X POST http://localhost:5000/api/wishlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":"65f1a2b3c4d5e6f7g8h9i0j1"}'
```
✅ **Expected**: 409 (already exists) or update existing

---

### Test 2.2: Get User's Wishlist
**Endpoint**: `GET /api/wishlist`
**Auth**: Required ✅

```bash
curl -X GET http://localhost:5000/api/wishlist \
  -H "Authorization: Bearer $TOKEN"
```
✅ **Expected**: 200 with array of wishlist items
✅ **Check**: Items should include productName, price, image, addedAt

---

### Test 2.3: Remove from Wishlist
**Endpoint**: `DELETE /api/wishlist/:id`
**Auth**: Required ✅

```bash
# Get wishlist to find ID
curl -X GET http://localhost:5000/api/wishlist \
  -H "Authorization: Bearer $TOKEN"

# Remove item (replace ID with actual item ID)
curl -X DELETE http://localhost:5000/api/wishlist/65f1a2b3c4d5e6f7g8h9i0j1 \
  -H "Authorization: Bearer $TOKEN"
```
✅ **Expected**: 200 with success message

---

## 🧪 Test Suite 3: Reviews & Ratings

### Test 3.1: Create Product Review
**Endpoint**: `POST /api/reviews`
**Auth**: Required ✅

```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId":"65f1a2b3c4d5e6f7g8h9i0j1",
    "rating":5,
    "title":"Excellent quality!",
    "comment":"This jewelry is absolutely beautiful and well-crafted. Arrived quickly and packaging was excellent."
  }'
```
✅ **Expected**: 200 with review created

**Invalid Test - Rating Out of Range**:
```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId":"65f1a2b3c4d5e6f7g8h9i0j1",
    "rating":10,
    "title":"Test",
    "comment":"Out of range rating"
  }'
```
✅ **Expected**: 400 error (rating must be 1-5)

---

### Test 3.2: Get Product Reviews (Public)
**Endpoint**: `GET /api/reviews/:productId`
**Auth**: Not Required ✅

```bash
curl -X GET http://localhost:5000/api/reviews/65f1a2b3c4d5e6f7g8h9i0j1
```
✅ **Expected**: 200 with reviews array
✅ **Check**: Should include:
  - reviews array with all reviews
  - stats object with averageRating and totalReviews
  - Each review should have: rating, title, comment, createdAt

---

### Test 3.3: Delete Own Review
**Endpoint**: `DELETE /api/reviews/:id`
**Auth**: Required ✅

```bash
# Get reviews to find review ID
curl -X GET http://localhost:5000/api/reviews/65f1a2b3c4d5e6f7g8h9i0j1 \
  | grep -o '"_id":"[^"]*'

# Delete review (replace with actual review ID)
curl -X DELETE http://localhost:5000/api/reviews/65f1a2b3c4d5e6f7g8h9i0j1 \
  -H "Authorization: Bearer $TOKEN"
```
✅ **Expected**: 200 with success message

---

## 🧪 Test Suite 4: Advanced Search & Filters

### Test 4.1: Basic Text Search
**Endpoint**: `GET /api/search`
**Auth**: Not Required ✅

```bash
# Search for diamond rings
curl -X GET "http://localhost:5000/api/search?q=diamond"
```
✅ **Expected**: 200 with matching products
✅ **Check**: Products should contain "diamond" in name/description/tags

---

### Test 4.2: Search with Category Filter
```bash
curl -X GET "http://localhost:5000/api/search?q=diamond&category=Rings"
```
✅ **Expected**: 200 with diamond rings only

---

### Test 4.3: Search with Price Range
```bash
# Products between 50,000 and 500,000
curl -X GET "http://localhost:5000/api/search?minPrice=50000&maxPrice=500000"
```
✅ **Expected**: 200 with products in price range

---

### Test 4.4: Search with Sorting
```bash
# Sort by price ascending
curl -X GET "http://localhost:5000/api/search?sort=price_asc"

# Sort by price descending
curl -X GET "http://localhost:5000/api/search?sort=price_desc"

# Sort by popularity
curl -X GET "http://localhost:5000/api/search?sort=popular"

# Sort by newest
curl -X GET "http://localhost:5000/api/search?sort=newest"
```
✅ **Expected**: 200 with products sorted appropriately

---

### Test 4.5: Search with Pagination
```bash
# Get first page (20 items per page)
curl -X GET "http://localhost:5000/api/search?page=1&limit=20"

# Get second page
curl -X GET "http://localhost:5000/api/search?page=2&limit=20"

# Get 10 items per page
curl -X GET "http://localhost:5000/api/search?page=1&limit=10"
```
✅ **Expected**: 200 with pagination metadata
✅ **Check**: Response should include:
  - products array
  - pagination object: { current, total, limit, count, totalItems }

---

### Test 4.6: Combined Search
```bash
# Search: category=Rings, price 50000-500000, sort by price asc, page 1
curl -X GET "http://localhost:5000/api/search?q=diamond&category=Rings&minPrice=50000&maxPrice=500000&sort=price_asc&page=1&limit=15"
```
✅ **Expected**: 200 with filtered, sorted, paginated results

---

### Test 4.7: Get Available Categories
**Endpoint**: `GET /api/categories/list`
**Auth**: Not Required ✅

```bash
curl -X GET "http://localhost:5000/api/categories/list"
```
✅ **Expected**: 200 with array of category names
✅ **Example**: `["Rings", "Necklaces", "Bracelets", "Earrings"]`

---

### Test 4.8: Get Price Range
**Endpoint**: `GET /api/products/price-range`
**Auth**: Not Required ✅

```bash
curl -X GET "http://localhost:5000/api/products/price-range"
```
✅ **Expected**: 200 with min/max prices
✅ **Example Response**:
```json
{
  "success": true,
  "priceRange": {
    "min": 15000,
    "max": 5000000
  }
}
```

---

## 🧪 Test Suite 5: Product Pagination

### Test 5.1: Get Products with Pagination
**Endpoint**: `GET /api/products`

```bash
# Get first page
curl -X GET "http://localhost:5000/api/products?page=1&limit=20"

# Get second page
curl -X GET "http://localhost:5000/api/products?page=2&limit=20"

# Custom limit
curl -X GET "http://localhost:5000/api/products?page=1&limit=10"
```
✅ **Expected**: 200 with pagination metadata
✅ **Check Response**:
```json
{
  "success": true,
  "products": [...],
  "pagination": {
    "current": 1,
    "total": 5,
    "limit": 20,
    "count": 20,
    "totalItems": 87
  }
}
```

---

### Test 5.2: Filter by Category
```bash
curl -X GET "http://localhost:5000/api/products?category=Rings&page=1&limit=20"
```
✅ **Expected**: 200 with only Ring products

---

### Test 5.3: Filter by Availability
```bash
curl -X GET "http://localhost:5000/api/products?available=true&page=1&limit=20"
```
✅ **Expected**: 200 with only available products

---

## 🧪 Test Suite 6: Email Notifications

### Test 6.1: Order Status Email (Via Webhook)
**When**: Payment successful via Paystack

The email should be automatically triggered:
1. ✅ **Confirmation Email** (existing)
2. ✅ **Processing Status Email** (newly integrated)

**Check Email Content**:
- Status: "Processing" with 📦 icon
- Color: Blue (#2196F3)
- Message: "Your order is being prepared for shipment"
- Order reference
- Items details
- Total amount

---

### Test 6.2: Manual Email Test (If Needed)
You can manually test the email function by adding a route:

```javascript
// Add this temporary route for testing
app.get("/api/test/send-email", async (req, res) => {
  try {
    const orderData = {
      reference: "TEST123",
      items: [
        { name: "Diamond Ring", quantity: 1, price: 150000 }
      ],
      amount: 150000,
      name: "Test Customer",
      email: "your-test-email@gmail.com",
      date: new Date().toLocaleDateString()
    };
    
    await sendOrderStatusEmail(
      "your-test-email@gmail.com",
      orderData,
      "shipped"
    );
    
    res.json({ success: true, message: "Email sent" });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
```

Then visit: `http://localhost:5000/api/test/send-email`

---

## 📊 Test Results Checklist

### Validation Tests
- [ ] Login validation (empty email, short password)
- [ ] Newsletter validation (invalid email)
- [ ] OTP validation (missing fields)
- [ ] Message validation (short body)

### Wishlist Tests
- [ ] Add product to wishlist
- [ ] Prevent duplicate additions
- [ ] Get user's wishlist
- [ ] Remove from wishlist
- [ ] Access control (only own wishlist visible)

### Review Tests
- [ ] Create review (5 stars)
- [ ] Create review (1 star)
- [ ] Rating validation (1-5 only)
- [ ] Get reviews with average rating
- [ ] One review per user per product
- [ ] Delete own review

### Search Tests
- [ ] Text search (find by keyword)
- [ ] Category filter (filter by category)
- [ ] Price range (min/max filter)
- [ ] Sorting (price_asc, price_desc, popular)
- [ ] Pagination (page/limit)
- [ ] Combined filters (all together)
- [ ] Get categories list
- [ ] Get price range

### Pagination Tests
- [ ] Products pagination
- [ ] Category filter with pagination
- [ ] Availability filter with pagination
- [ ] Pagination metadata accuracy

### Email Tests
- [ ] Paystack webhook sends confirmation email
- [ ] Paystack webhook sends processing status email
- [ ] Email contains correct order details
- [ ] Email formatting looks good
- [ ] All status types tested (pending, processing, shipped, delivered, cancelled)

---

## 🐛 Troubleshooting

### Issue: Validation Errors Not Showing
**Solution**: Make sure Joi is installed:
```bash
npm install joi
```

### Issue: Email Not Sending
**Solution**: Check SMTP settings in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Issue: Database Indexes Not Created
**Solution**: Run migration script:
```bash
node scripts/migrate-indexes.js
```

### Issue: Wishlist Items Not Showing
**Solution**: Make sure you're using valid product IDs that exist in database

### Issue: Search Not Finding Products
**Solution**: 
1. Verify products exist in database
2. Run index migration script
3. Ensure text search is enabled on Product collection

---

## 📝 Test Data

Create some test data to work with:

### Test Products (MongoDB)
```javascript
db.products.insertMany([
  {
    name: "Diamond Engagement Ring",
    price: 250000,
    category: "Rings",
    description: "Beautiful diamond engagement ring",
    tags: ["diamond", "engagement", "ring"],
    stock: 10,
    available: true,
    views: 150
  },
  {
    name: "Gold Bracelet",
    price: 85000,
    category: "Bracelets",
    description: "Elegant 18k gold bracelet",
    tags: ["gold", "bracelet"],
    stock: 5,
    available: true,
    views: 89
  }
])
```

---

## ✅ Summary

**Total Test Cases**: 40+

**Critical Tests (Run First)**:
1. ✅ Input validation (prevents injections)
2. ✅ Search/filter functionality (UX critical)
3. ✅ Wishlist CRUD (core feature)
4. ✅ Reviews system (social proof)
5. ✅ Email notifications (customer communication)

**Estimated Testing Time**: 45-60 minutes

---

**Last Updated**: December 24, 2025  
**Phase**: 2 Testing  
**Status**: Ready for Testing ✅
