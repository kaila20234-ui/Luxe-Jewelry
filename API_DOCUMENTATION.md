# API Documentation

## Overview

Complete API reference for the SIWES Jewelry E-Commerce Platform. All endpoints include authentication, error handling, and rate limiting.

---

## Authentication

### JWT Authentication

All protected endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### Login Endpoint

**POST** `/api/auth/login`

```json
Request:
{
  "email": "user@example.com",
  "password": "secure_password",
  "role": "admin"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com",
    "role": "admin"
  }
}

Error (401):
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

## Products Endpoints

### Get All Products

**GET** `/api/products`

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter

```json
Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Diamond Ring",
      "category": "Rings",
      "price": 150000,
      "description": "Elegant diamond engagement ring",
      "images": ["https://example.com/ring1.jpg"],
      "stock": 5,
      "rating": 4.8,
      "reviews": 23
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Get Single Product

**GET** `/api/products/:id`

```json
Response (200):
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Diamond Ring",
    "price": 150000,
    "description": "Full product details...",
    "stock": 5,
    "specifications": {
      "material": "18K Gold",
      "gemstone": "Diamond",
      "weight": "5.2g"
    }
  }
}
```

---

## Wishlist Endpoints

### Get Wishlist

**GET** `/api/wishlist`

*Requires Authentication*

```json
Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "productId": "507f1f77bcf86cd799439012",
      "name": "Diamond Ring",
      "price": 150000,
      "addedAt": "2024-12-24T10:30:00Z"
    }
  ]
}
```

### Add to Wishlist

**POST** `/api/wishlist`

*Requires Authentication*

```json
Request:
{
  "productId": "507f1f77bcf86cd799439012"
}

Response (201):
{
  "success": true,
  "message": "Added to wishlist",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "productId": "507f1f77bcf86cd799439012"
  }
}
```

### Remove from Wishlist

**DELETE** `/api/wishlist/:id`

*Requires Authentication*

```json
Response (200):
{
  "success": true,
  "message": "Removed from wishlist"
}
```

---

## Reviews Endpoints

### Get Reviews

**GET** `/api/reviews?productId=507f1f77bcf86cd799439012`

```json
Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "productId": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439014",
      "userName": "John Doe",
      "rating": 5,
      "title": "Excellent quality!",
      "comment": "Beautiful piece, highly recommend",
      "createdAt": "2024-12-20T15:30:00Z"
    }
  ],
  "averageRating": 4.7,
  "totalReviews": 12
}
```

### Create Review

**POST** `/api/reviews`

*Requires Authentication*

```json
Request:
{
  "productId": "507f1f77bcf86cd799439012",
  "rating": 5,
  "title": "Excellent product",
  "comment": "Very satisfied with this purchase"
}

Response (201):
{
  "success": true,
  "message": "Review created",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "productId": "507f1f77bcf86cd799439012",
    "rating": 5,
    "title": "Excellent product"
  }
}
```

### Update Review

**PUT** `/api/reviews/:id`

*Requires Authentication*

```json
Request:
{
  "rating": 4,
  "comment": "Updated review..."
}

Response (200):
{
  "success": true,
  "message": "Review updated"
}
```

### Delete Review

**DELETE** `/api/reviews/:id`

*Requires Authentication*

```json
Response (200):
{
  "success": true,
  "message": "Review deleted"
}
```

---

## Search Endpoint

### Search Products

**GET** `/api/search?query=diamond&category=rings&sort=price`

Query Parameters:
- `query` (optional): Search term
- `category` (optional): Filter by category
- `sort` (optional): Sort by (relevance, price, rating, newest)
- `page` (optional): Page number

```json
Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Diamond Engagement Ring",
      "category": "Rings",
      "price": 150000,
      "relevance": 0.95
    }
  ],
  "pagination": {
    "total": 23,
    "page": 1,
    "pages": 3
  }
}
```

---

## Cart Endpoints

### Get Cart

**GET** `/api/cart`

*Requires Authentication*

```json
Response (200):
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "name": "Diamond Ring",
        "price": 150000,
        "quantity": 1,
        "subtotal": 150000
      }
    ],
    "total": 150000,
    "itemCount": 1
  }
}
```

### Add to Cart

**POST** `/api/cart`

*Requires Authentication*

```json
Request:
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1
}

Response (201):
{
  "success": true,
  "message": "Added to cart"
}
```

### Update Cart Item

**PUT** `/api/cart/:itemId`

*Requires Authentication*

```json
Request:
{
  "quantity": 2
}

Response (200):
{
  "success": true,
  "message": "Cart updated"
}
```

### Remove from Cart

**DELETE** `/api/cart/:itemId`

*Requires Authentication*

```json
Response (200):
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

## Payment Endpoint

### Process Payment

**POST** `/api/payment/webhook`

*Webhook from Paystack*

```json
Request Headers:
{
  "x-paystack-signature": "signature_hash"
}

Request Body:
{
  "event": "charge.success",
  "data": {
    "reference": "paystack_ref_12345",
    "amount": 150000,
    "customer": {
      "email": "customer@example.com"
    }
  }
}

Response (200):
{
  "success": true,
  "message": "Payment processed",
  "order": {
    "reference": "paystack_ref_12345",
    "status": "paid"
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "error details"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_INPUT | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE | 409 | Resource already exists |
| SERVER_ERROR | 500 | Internal server error |
| PAYMENT_ERROR | 402 | Payment processing failed |
| RATE_LIMIT | 429 | Too many requests |

### Example Errors

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error",
  "code": "INVALID_INPUT",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Invalid or missing token",
  "code": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Product not found",
  "code": "NOT_FOUND"
}
```

---

## Rate Limiting

All endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Public endpoints**: 30 requests per minute per IP
- **Protected endpoints**: 100 requests per minute per user

Rate limit info included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703423400
```

---

## Testing Examples

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "role": "admin"
  }'
```

**Get Products:**
```bash
curl http://localhost:5000/api/products?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Review:**
```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "507f1f77bcf86cd799439012",
    "rating": 5,
    "title": "Excellent!",
    "comment": "Great quality"
  }'
```

### Using JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  })
});
const { token } = await loginResponse.json();

// Get Products
const productsResponse = await fetch('/api/products?page=1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const products = await productsResponse.json();
```

---

## Response Format

### Success Response (200, 201)

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2024-12-24T10:30:00Z"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "message": "Error occurred",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-12-24T10:30:00Z"
}
```

---

## Security

- **JWT Tokens**: All tokens expire in 24 hours
- **HTTPS Only**: All endpoints require HTTPS in production
- **CORS**: Configured to allow specific origins
- **Helmet**: Security headers enabled
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **CSRF Protection**: Enabled on all state-changing operations

---

## Versioning

Current API Version: **v1.0.0**

Future versions will use `/api/v2/` endpoint prefix.

---

## Support

For API issues or questions:
- Email: support@jewelry.local
- Documentation: https://docs.jewelry.local
- Status Page: https://status.jewelry.local

---

**Last Updated**: December 24, 2024
**Documentation Version**: 1.0.0
