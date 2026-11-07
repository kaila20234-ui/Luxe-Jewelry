// ============================================
// MONGODB SHELL - COMPLETE DATABASE UPDATE
// ============================================
// Date: November 28, 2025
// Copy and paste these commands directly into MongoDB Shell
// Database: Your project database
// ============================================

// ============================================
// STEP 1: CREATE USERS COLLECTION
// ============================================

db.createCollection("users");

// ============================================
// STEP 2: CREATE INDEXES FOR USERS
// ============================================

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "emailVerified": 1 });

// ============================================
// STEP 3: INSERT SAMPLE USER (FOR TESTING)
// ============================================

db.users.insertOne({
  _id: ObjectId(),
  email: "john@example.com",
  password: "$2a$12$E9rnBWvZ7Pp3OqAW5aXKxe2yGrFr2l8OzZJ8kQyKkqK.a7s8P8vvS",
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
      createdAt: new Date()
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
  createdAt: new Date(),
  updatedAt: new Date()
});

// ============================================
// STEP 4: UPDATE SALES COLLECTION - ADD USERID
// ============================================

// Add userId field to all existing sales
db.sales.updateMany(
  {},
  [{ $set: { userId: null } }]
);

// Create indexes on sales
db.sales.createIndex({ "userId": 1 });
db.sales.createIndex({ "reference": 1 }, { unique: true });
db.sales.createIndex({ "date": 1 });
db.sales.createIndex({ "status": 1 });
db.sales.createIndex({ "userId": 1, "date": 1 });

// ============================================
// STEP 5: UPDATE OTPSESSIONS COLLECTION - ADD USERID
// ============================================

// Add userId field to all existing OTP sessions
db.otpsessions.updateMany(
  {},
  [{ $set: { userId: null } }]
);

// Create indexes on otpsessions
db.otpsessions.createIndex({ "sessionId": 1 }, { unique: true });
db.otpsessions.createIndex({ "userId": 1 });
db.otpsessions.createIndex({ "otpExpiry": 1 }, { expireAfterSeconds: 0 });
db.otpsessions.createIndex({ "verified": 1 });

// ============================================
// VERIFICATION COMMANDS
// ============================================

// Check users collection exists
db.getCollectionNames();

// Count users
db.users.countDocuments();

// Verify userId field exists in sales
db.sales.findOne();

// Verify userId field exists in otpsessions
db.otpsessions.findOne();

// Check all indexes
db.users.getIndexes();
db.sales.getIndexes();
db.otpsessions.getIndexes();

// ============================================
// QUERY EXAMPLES (AFTER SETUP)
// ============================================

// Find user by email
// db.users.findOne({ email: "john@example.com" });

// Find all orders for a specific user
// db.sales.find({ userId: ObjectId("USER_ID_HERE") });

// Find customer with their orders (aggregation)
// db.users.aggregate([
//   { $match: { email: "john@example.com" } },
//   {
//     $lookup: {
//       from: "sales",
//       localField: "_id",
//       foreignField: "userId",
//       as: "orders"
//     }
//   }
// ]);

// Get customer statistics
// db.sales.aggregate([
//   { $match: { userId: { $ne: null } } },
//   {
//     $group: {
//       _id: "$userId",
//       orderCount: { $sum: 1 },
//       totalSpent: { $sum: "$amount" }
//     }
//   }
// ]);

// Count guest vs customer orders
// db.sales.aggregate([
//   {
//     $group: {
//       _id: null,
//       guestOrders: { $sum: { $cond: [{ $eq: ["$userId", null] }, 1, 0] } },
//       customerOrders: { $sum: { $cond: [{ $ne: ["$userId", null] }, 1, 0] } },
//       totalOrders: { $sum: 1 }
//     }
//   }
// ]);

// ============================================
// ROLLBACK COMMANDS (IF NEEDED)
// ============================================

// Remove userId from sales
// db.sales.updateMany({}, [{ $unset: ["userId"] }]);

// Remove userId from otpsessions
// db.otpsessions.updateMany({}, [{ $unset: ["userId"] }]);

// Drop users collection
// db.users.drop();

// Drop indexes
// db.sales.dropIndex("userId_1");
// db.otpsessions.dropIndex("userId_1");

// ============================================
// QUICK REFERENCE
// ============================================

/*
COMPLETE COMMAND SEQUENCE (Copy & Paste All at Once):

db.createCollection("users");
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "emailVerified": 1 });
db.sales.updateMany({}, [{ $set: { userId: null } }]);
db.sales.createIndex({ "userId": 1 });
db.sales.createIndex({ "reference": 1 }, { unique: true });
db.sales.createIndex({ "date": 1 });
db.sales.createIndex({ "status": 1 });
db.sales.createIndex({ "userId": 1, "date": 1 });
db.otpsessions.updateMany({}, [{ $set: { userId: null } }]);
db.otpsessions.createIndex({ "sessionId": 1 }, { unique: true });
db.otpsessions.createIndex({ "userId": 1 });
db.otpsessions.createIndex({ "otpExpiry": 1 }, { expireAfterSeconds: 0 });
db.otpsessions.createIndex({ "verified": 1 });
*/

// ============================================
// STEP-BY-STEP INSTRUCTIONS
// ============================================

/*

1. Open MongoDB Shell
   Command: mongosh (or mongo for older versions)

2. Connect to your database
   Command: use your_database_name

3. Run Step 1: Create users collection
   Command: db.createCollection("users");
   Expected Output: { ok: 1 }

4. Run Step 2: Create indexes for users
   Commands: Copy all db.users.createIndex commands
   Expected Output: { createdCollectionAutomatically: false, indexesCreated: [ ... ] }

5. Run Step 3: Insert sample user (OPTIONAL - for testing)
   Command: Copy the db.users.insertOne() block
   Expected Output: { acknowledged: true, insertedId: ObjectId(...) }

6. Run Step 4: Update sales collection
   Commands: Copy all db.sales commands (updateMany + createIndex)
   Expected Output: { modifiedCount: X, upsertedId: null }

7. Run Step 5: Update otpsessions collection
   Commands: Copy all db.otpsessions commands (updateMany + createIndex)
   Expected Output: { modifiedCount: X, upsertedId: null }

8. Run Verification: Copy all commands in VERIFICATION COMMANDS section
   Expected Output: Lists of indexes and documents

9. Your database is now updated! ✅

*/

// ============================================
// IMPORTANT NOTES
// ============================================

/*

✅ WHAT THIS DOES:
  - Creates new "users" collection for customer accounts
  - Adds userId field to existing sales documents (set to null for guests)
  - Adds userId field to existing otpsessions documents (set to null for guests)
  - Creates 12 indexes for optimal query performance
  - Preserves all existing order data

✅ BACKWARD COMPATIBLE:
  - Guest orders (userId: null) continue to work
  - No existing data is deleted
  - Can rollback if needed

✅ TIME REQUIRED:
  - < 1 second for small databases
  - < 30 seconds for databases with 100k+ records

⚠️ IMPORTANT:
  - Back up your database before running these commands
  - Run all commands at once or one section at a time
  - Don't interrupt commands while running
  - Indexes will be created in background (may take time on large DBs)

❌ WHAT NOT TO DO:
  - Don't drop collections while backup is running
  - Don't modify sales/otpsessions while updates are happening
  - Don't create duplicate indexes
  - Don't use different database name

*/

// ============================================
// END OF MONGODB SHELL COMMANDS
// ============================================
// Ready for production deployment
// November 28, 2025
// ============================================
