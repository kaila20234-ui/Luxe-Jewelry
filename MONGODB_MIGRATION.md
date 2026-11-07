# MongoDB Migration Guide - Customer Login Implementation

## Overview

This document provides all SQL-equivalent MongoDB commands to update your existing database with the new customer authentication features we've implemented.

---

## Schema Changes Summary

### 1. **Users Collection** (NEW)
Create a new collection for customer accounts with authentication fields.

### 2. **Sales Collection** (UPDATED)
Add `userId` field to link orders to customer accounts.

### 3. **OtpSessions Collection** (UPDATED)
Add `userId` field to track OTP sessions for logged-in customers.

---

## Migration Commands

### Step 1: Create Users Collection

**MongoDB Shell Command:**
```javascript
db.createCollection("users");

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
```

**Insert Sample Document (for testing):**
```javascript
db.users.insertOne({
  _id: ObjectId(),
  email: "customer@example.com",
  password: "$2a$12$hashedPasswordHere...", // bcrypt hashed
  name: "John Doe",
  phone: "+234-812-345-6789",
  avatar: null,
  addresses: [
    {
      label: "Home",
      street: "123 Main Street",
      city: "Lagos",
      zipcode: "100001",
      isDefault: true,
      createdAt: ISODate("2025-11-28T10:00:00Z")
    }
  ],
  preferences: {
    newsletter: true,
    notifications: true
  },
  emailVerified: false,
  verificationToken: null,
  verificationTokenExpiry: null,
  passwordResetToken: null,
  passwordResetTokenExpiry: null,
  createdAt: ISODate("2025-11-28T10:00:00Z"),
  updatedAt: ISODate("2025-11-28T10:00:00Z")
});
```

---

### Step 2: Update Sales Collection

**Add userId field to existing sales:**
```javascript
// Add userId field to all existing documents (set to null for guest orders)
db.sales.updateMany(
  {},
  [
    {
      $addFields: {
        userId: null
      }
    }
  ]
);
```

**Create indexes for better query performance:**
```javascript
db.sales.createIndex({ "userId": 1 });
db.sales.createIndex({ "reference": 1 }, { unique: true });
db.sales.createIndex({ "date": 1 });
db.sales.createIndex({ "status": 1 });
```

**Verify the update:**
```javascript
db.sales.findOne(); // Should show userId field
```

---

### Step 3: Update OtpSessions Collection

**Add userId field to existing sessions:**
```javascript
db.otpsessions.updateMany(
  {},
  [
    {
      $addFields: {
        userId: null
      }
    }
  ]
);
```

**Create indexes:**
```javascript
db.otpsessions.createIndex({ "sessionId": 1 }, { unique: true });
db.otpsessions.createIndex({ "userId": 1 });
db.otpsessions.createIndex({ "otpExpiry": 1 }, { expireAfterSeconds: 0 });
```

**Verify the update:**
```javascript
db.otpsessions.findOne();
```

---

## SQL Equivalent Statements

### For Reference (SQL syntax)

If you were using SQL instead of MongoDB, here's what the equivalent would be:

```sql
-- Create Users Table
CREATE TABLE users (
  _id CHAR(24) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  avatar VARCHAR(255),
  preferences_newsletter BOOLEAN DEFAULT TRUE,
  preferences_notifications BOOLEAN DEFAULT TRUE,
  emailVerified BOOLEAN DEFAULT FALSE,
  verificationToken VARCHAR(255),
  verificationTokenExpiry TIMESTAMP,
  passwordResetToken VARCHAR(255),
  passwordResetTokenExpiry TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Addresses Table (for subdocuments)
CREATE TABLE user_addresses (
  _id CHAR(24) PRIMARY KEY,
  userId CHAR(24) NOT NULL,
  label VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  zipcode VARCHAR(20),
  isDefault BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE
);

-- Update Sales Table
ALTER TABLE sales
ADD COLUMN userId CHAR(24),
ADD FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL;

-- Create index on sales.userId
CREATE INDEX idx_sales_userId ON sales(userId);

-- Update OtpSessions Table
ALTER TABLE otpsessions
ADD COLUMN userId CHAR(24),
ADD FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL;

-- Create indexes on otpsessions
CREATE INDEX idx_otpsessions_userId ON otpsessions(userId);
CREATE INDEX idx_otpsessions_sessionId ON otpsessions(sessionId);
```

---

## MongoDB Document Structure Reference

### Users Document Example
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "john@example.com",
  "password": "$2a$12$E9rnBW...",  // bcrypt hashed
  "name": "John Doe",
  "phone": "+234-812-3456789",
  "avatar": null,
  "addresses": [
    {
      "label": "Home",
      "street": "123 Main Street",
      "city": "Lagos",
      "zipcode": "100001",
      "isDefault": true,
      "createdAt": ISODate("2025-11-28T10:00:00.000Z")
    }
  ],
  "preferences": {
    "newsletter": true,
    "notifications": true
  },
  "emailVerified": false,
  "verificationToken": null,
  "verificationTokenExpiry": null,
  "passwordResetToken": null,
  "passwordResetTokenExpiry": null,
  "createdAt": ISODate("2025-11-28T10:00:00.000Z"),
  "updatedAt": ISODate("2025-11-28T10:00:00.000Z")
}
```

### Updated Sales Document Example
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "reference": "SALE_12345",
  "userId": ObjectId("507f1f77bcf86cd799439011"),  // NEW: Links to customer
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+234-812-3456789",
  "address": "123 Main Street, Lagos",
  "amount": 50000,
  "status": "paid",
  "paidAt": ISODate("2025-11-28T10:15:00.000Z"),
  "otpVerified": true,
  "items": [
    {
      "productId": "prod_123",
      "productName": "Gold Ring",
      "price": 25000,
      "quantity": 2,
      "subtotal": 50000
    }
  ],
  "date": ISODate("2025-11-28T10:15:00.000Z")
}
```

### Updated OtpSession Document Example
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "sessionId": "otp_sess_abc123",
  "reference": "SALE_12345",
  "userId": ObjectId("507f1f77bcf86cd799439011"),  // NEW: Links to customer
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+234-812-3456789",
  "address": "123 Main Street, Lagos",
  "amount": 50000,
  "items": [
    {
      "productId": "prod_123",
      "productName": "Gold Ring",
      "price": 25000,
      "quantity": 2,
      "subtotal": 50000
    }
  ],
  "otpHash": "$2a$12$hashedOtpHere...",
  "otpExpiry": ISODate("2025-11-28T10:05:00.000Z"),
  "verified": false,
  "createdAt": ISODate("2025-11-28T10:00:00.000Z")
}
```

---

## Step-by-Step Migration Process

### For Existing Database

If you already have `sales` and `otpsessions` data, follow this order:

#### 1. Backup Your Database
```bash
# Using MongoDB tools
mongodump --uri "mongodb://localhost:27017/your_db_name" --out ./backup
```

#### 2. Create Users Collection
```javascript
db.createCollection("users");
db.users.createIndex({ "email": 1 }, { unique: true });
```

#### 3. Update Existing Sales
```javascript
db.sales.updateMany(
  { userId: { $exists: false } },
  [{ $set: { userId: null } }]
);
db.sales.createIndex({ "userId": 1 });
```

#### 4. Update Existing OtpSessions
```javascript
db.otpsessions.updateMany(
  { userId: { $exists: false } },
  [{ $set: { userId: null } }]
);
db.otpsessions.createIndex({ "userId": 1 });
```

#### 5. Verify All Collections
```javascript
// Check users collection exists
db.getCollectionNames().includes("users");

// Check fields exist
db.sales.findOne().userId;
db.otpsessions.findOne().userId;
```

---

## Query Examples After Migration

### Find all orders by a specific customer
```javascript
const userId = ObjectId("507f1f77bcf86cd799439011");
db.sales.find({ userId: userId });
```

**SQL Equivalent:**
```sql
SELECT * FROM sales WHERE userId = '507f1f77bcf86cd799439011';
```

---

### Find customer profile with all orders
```javascript
db.users.aggregate([
  {
    $match: { email: "john@example.com" }
  },
  {
    $lookup: {
      from: "sales",
      localField: "_id",
      foreignField: "userId",
      as: "orders"
    }
  }
]);
```

**SQL Equivalent:**
```sql
SELECT u.*, s.* FROM users u 
LEFT JOIN sales s ON u._id = s.userId 
WHERE u.email = 'john@example.com';
```

---

### Count total orders per customer
```javascript
db.sales.aggregate([
  {
    $group: {
      _id: "$userId",
      orderCount: { $sum: 1 },
      totalSpent: { $sum: "$amount" }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "customer"
    }
  }
]);
```

**SQL Equivalent:**
```sql
SELECT 
  u._id,
  u.email,
  COUNT(s._id) as orderCount,
  SUM(s.amount) as totalSpent
FROM users u
LEFT JOIN sales s ON u._id = s.userId
GROUP BY u._id;
```

---

### Find guest vs registered customer orders
```javascript
// Guest orders (userId is null)
db.sales.find({ userId: null });

// Registered customer orders
db.sales.find({ userId: { $ne: null } });

// Statistics
db.sales.aggregate([
  {
    $group: {
      _id: null,
      guestOrders: { $sum: { $cond: [{ $eq: ["$userId", null] }, 1, 0] } },
      customerOrders: { $sum: { $cond: [{ $ne: ["$userId", null] }, 1, 0] } },
      totalOrders: { $sum: 1 }
    }
  }
]);
```

---

## Rollback Instructions

If you need to revert these changes:

```javascript
// Remove userId from sales
db.sales.updateMany({}, [{ $unset: ["userId"] }]);

// Remove userId from otpsessions
db.otpsessions.updateMany({}, [{ $unset: ["userId"] }]);

// Drop users collection
db.users.drop();

// Drop indexes
db.sales.dropIndex("userId_1");
db.otpsessions.dropIndex("userId_1");
```

---

## Verification Checklist

After running migrations, verify:

- [ ] `users` collection created
- [ ] `users` has unique index on `email`
- [ ] `sales` has `userId` field
- [ ] `otpsessions` has `userId` field
- [ ] `sales` has index on `userId`
- [ ] `otpsessions` has index on `userId`
- [ ] Existing orders still exist (with `userId: null`)
- [ ] Server starts without errors
- [ ] Can create new user accounts
- [ ] Can login with existing accounts
- [ ] New orders link to customer `userId`
- [ ] Customer dashboard shows orders
- [ ] Guest checkout still works

---

## Performance Notes

### Indexes Created
| Collection | Field | Purpose |
|-----------|-------|---------|
| users | email | Fast email lookup during login |
| users | createdAt | Sort by registration date |
| sales | userId | Find all orders by customer |
| sales | reference | Verify unique transaction IDs |
| sales | date | Sort orders by date |
| sales | status | Filter by payment status |
| otpsessions | sessionId | Lookup OTP session by ID |
| otpsessions | userId | Find all OTP sessions for customer |
| otpsessions | otpExpiry | TTL auto-deletion after expiry |

### Expected Query Times
- Login lookup: < 5ms (indexed by email)
- Customer orders: < 20ms (indexed by userId)
- Order detail: < 2ms (indexed by reference)
- OTP session: < 5ms (indexed by sessionId)

---

## Troubleshooting

### Error: "E11000 duplicate key error"
**Cause:** Duplicate email in users collection
**Solution:**
```javascript
// Find duplicates
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);

// Remove duplicates manually or script to keep latest only
```

### Error: "userId is not ObjectId"
**Cause:** Storing userId as string instead of ObjectId
**Solution:**
```javascript
// Fix conversion
db.sales.updateMany(
  { userId: { $type: "string" } },
  [{ $set: { userId: { $toObjectId: "$userId" } } }]
);
```

### New users can't be created
**Cause:** Indexes not created properly
**Solution:**
```javascript
// Rebuild indexes
db.users.dropIndexes();
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
```

---

## Next Steps

1. ✅ Run the migration commands above
2. ✅ Verify all changes with checklist
3. ✅ Test login/registration flow
4. ✅ Test customer dashboard
5. ✅ Test checkout with logged-in user
6. ✅ Monitor server logs for errors
7. 📊 Monitor database performance metrics

---

**Last Updated:** November 28, 2025
**Migration Status:** Ready for Production
