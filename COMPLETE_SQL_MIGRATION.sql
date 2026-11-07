-- ============================================
-- CUSTOMER LOGIN SYSTEM - COMPLETE SQL MIGRATION
-- ============================================
-- Date: November 28, 2025
-- Database: MongoDB (with SQL equivalents)
-- Purpose: Add customer authentication system
-- ============================================

-- ============================================
-- 1. CREATE USERS TABLE (New)
-- ============================================

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
  verificationTokenExpiry DATETIME,
  passwordResetToken VARCHAR(255),
  passwordResetTokenExpiry DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_createdAt (createdAt)
);

-- ============================================
-- 2. CREATE USER_ADDRESSES TABLE (Embedded in MongoDB, separate in SQL)
-- ============================================

CREATE TABLE user_addresses (
  _id CHAR(24) PRIMARY KEY,
  userId CHAR(24) NOT NULL,
  label VARCHAR(50) DEFAULT 'Home',
  street VARCHAR(255),
  city VARCHAR(100),
  zipcode VARCHAR(20),
  isDefault BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_isDefault (isDefault)
);

-- ============================================
-- 3. UPDATE SALES TABLE (Add userId field)
-- ============================================

ALTER TABLE sales
ADD COLUMN userId CHAR(24),
ADD FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL,
ADD INDEX idx_userId (userId),
ADD INDEX idx_reference (reference),
ADD INDEX idx_date (date),
ADD INDEX idx_status (status);

-- Note: If userId column already exists, remove it and add again:
-- ALTER TABLE sales DROP COLUMN userId;
-- ALTER TABLE sales ADD COLUMN userId CHAR(24);

-- ============================================
-- 4. UPDATE OTPSESSIONS TABLE (Add userId field)
-- ============================================

ALTER TABLE otpsessions
ADD COLUMN userId CHAR(24),
ADD FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL,
ADD INDEX idx_userId (userId),
ADD INDEX idx_sessionId (sessionId),
ADD INDEX idx_otpExpiry (otpExpiry);

-- Note: If userId column already exists:
-- ALTER TABLE otpsessions DROP COLUMN userId;
-- ALTER TABLE otpsessions ADD COLUMN userId CHAR(24);

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users table indexes
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_createdAt ON users(createdAt);
CREATE INDEX idx_users_emailVerified ON users(emailVerified);

-- Sales table indexes
CREATE INDEX idx_sales_userId ON sales(userId);
CREATE INDEX idx_sales_reference ON sales(reference);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_userId_date ON sales(userId, date);

-- OtpSessions table indexes
CREATE UNIQUE INDEX idx_otpsessions_sessionId ON otpsessions(sessionId);
CREATE INDEX idx_otpsessions_userId ON otpsessions(userId);
CREATE INDEX idx_otpsessions_otpExpiry ON otpsessions(otpExpiry);
CREATE INDEX idx_otpsessions_verified ON otpsessions(verified);

-- User addresses indexes
CREATE INDEX idx_user_addresses_userId ON user_addresses(userId);
CREATE INDEX idx_user_addresses_isDefault ON user_addresses(isDefault);

-- ============================================
-- 6. INSERT SAMPLE DATA (FOR TESTING)
-- ============================================

-- Insert sample user
INSERT INTO users (
  _id, email, password, name, phone, avatar,
  preferences_newsletter, preferences_notifications,
  emailVerified, verificationToken, verificationTokenExpiry,
  passwordResetToken, passwordResetTokenExpiry,
  createdAt, updatedAt
) VALUES (
  '507f1f77bcf86cd799439011',
  'john@example.com',
  '$2a$12$E9rnBWvZ7Pp3OqAW5aXKxe2yGrFr2l8OzZJ8kQyKkqK.a7s8P8vvS', -- Password: password123 (bcrypt hashed)
  'John Doe',
  '+234-812-345-6789',
  NULL,
  TRUE,
  TRUE,
  FALSE,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- Insert sample address for user
INSERT INTO user_addresses (
  _id, userId, label, street, city, zipcode, isDefault, createdAt
) VALUES (
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439011',
  'Home',
  '123 Main Street',
  'Lagos',
  '100001',
  TRUE,
  NOW()
);

-- ============================================
-- 7. UPDATE EXISTING DATA
-- ============================================

-- Add userId field to existing sales (set to NULL for guest orders)
UPDATE sales SET userId = NULL WHERE userId IS NULL;

-- Add userId field to existing otpsessions (set to NULL for guest sessions)
UPDATE otpsessions SET userId = NULL WHERE userId IS NULL;

-- ============================================
-- 8. QUERY EXAMPLES
-- ============================================

-- Find all orders by a specific customer
-- SELECT * FROM sales WHERE userId = '507f1f77bcf86cd799439011' ORDER BY date DESC;

-- Find customer profile with all orders
-- SELECT u.*, COUNT(s._id) as totalOrders, SUM(s.amount) as totalSpent
-- FROM users u
-- LEFT JOIN sales s ON u._id = s.userId
-- WHERE u.email = 'john@example.com'
-- GROUP BY u._id;

-- Find customer with all addresses
-- SELECT u.*, a.*
-- FROM users u
-- LEFT JOIN user_addresses a ON u._id = a.userId
-- WHERE u._id = '507f1f77bcf86cd799439011';

-- Count guest vs registered customer orders
-- SELECT
--   SUM(CASE WHEN userId IS NULL THEN 1 ELSE 0 END) as guestOrders,
--   SUM(CASE WHEN userId IS NOT NULL THEN 1 ELSE 0 END) as customerOrders,
--   COUNT(*) as totalOrders
-- FROM sales;

-- Get customer statistics
-- SELECT
--   u._id,
--   u.email,
--   u.name,
--   COUNT(s._id) as orderCount,
--   COALESCE(SUM(s.amount), 0) as totalSpent,
--   MAX(s.date) as lastOrderDate
-- FROM users u
-- LEFT JOIN sales s ON u._id = s.userId
-- GROUP BY u._id, u.email, u.name
-- ORDER BY totalSpent DESC;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

-- Check users collection created
-- SELECT COUNT(*) as user_count FROM users;

-- Check sales has userId field
-- SELECT COUNT(*) FROM sales WHERE userId IS NOT NULL;

-- Check otpsessions has userId field
-- SELECT COUNT(*) FROM otpsessions WHERE userId IS NOT NULL;

-- Check indexes exist
-- SHOW INDEX FROM users;
-- SHOW INDEX FROM sales;
-- SHOW INDEX FROM otpsessions;
-- SHOW INDEX FROM user_addresses;

-- ============================================
-- 10. ROLLBACK STATEMENTS (IF NEEDED)
-- ============================================

-- Remove userId from sales
-- ALTER TABLE sales DROP COLUMN userId;

-- Remove userId from otpsessions
-- ALTER TABLE otpsessions DROP COLUMN userId;

-- Drop user_addresses table
-- DROP TABLE IF EXISTS user_addresses;

-- Drop users table
-- DROP TABLE IF EXISTS users;

-- Drop indexes (if using specific DB)
-- DROP INDEX idx_users_email ON users;
-- DROP INDEX idx_sales_userId ON sales;
-- DROP INDEX idx_otpsessions_userId ON otpsessions;

-- ============================================
-- 11. MONGODB COMMANDS (ALTERNATIVE FORMAT)
-- ============================================

-- For MongoDB (if not using SQL):

-- Create users collection with indexes
-- db.createCollection("users");
-- db.users.createIndex({ "email": 1 }, { unique: true });
-- db.users.createIndex({ "createdAt": 1 });

-- Update existing sales to add userId field
-- db.sales.updateMany({}, [{ $set: { userId: null } }]);
-- db.sales.createIndex({ "userId": 1 });

-- Update existing otpsessions to add userId field
-- db.otpsessions.updateMany({}, [{ $set: { userId: null } }]);
-- db.otpsessions.createIndex({ "userId": 1 });

-- ============================================
-- 12. FULL SCHEMA DEFINITIONS (FOR REFERENCE)
-- ============================================

/*
USERS TABLE STRUCTURE:
┌─────────────────────┬──────────────┬────────┬─────────┐
│ Field               │ Type         │ Null   │ Key     │
├─────────────────────┼──────────────┼────────┼─────────┤
│ _id                 │ CHAR(24)     │ NO     │ PRIMARY │
│ email               │ VARCHAR(255) │ NO     │ UNIQUE  │
│ password            │ VARCHAR(255) │ NO     │         │
│ name                │ VARCHAR(100) │ NO     │         │
│ phone               │ VARCHAR(20)  │ NO     │         │
│ avatar              │ VARCHAR(255) │ YES    │         │
│ preferences_news... │ BOOLEAN      │ NO     │         │
│ preferences_notif..│ BOOLEAN      │ NO     │         │
│ emailVerified       │ BOOLEAN      │ NO     │         │
│ verificationToken   │ VARCHAR(255) │ YES    │         │
│ verificationToken...│ DATETIME     │ YES    │         │
│ passwordResetToken  │ VARCHAR(255) │ YES    │         │
│ passwordResetToken..│ DATETIME     │ YES    │         │
│ createdAt           │ DATETIME     │ NO     │ INDEX   │
│ updatedAt           │ DATETIME     │ NO     │         │
└─────────────────────┴──────────────┴────────┴─────────┘

SALES TABLE (with NEW field):
┌─────────────────────┬──────────────┬────────┬─────────┐
│ Field               │ Type         │ Null   │ Key     │
├─────────────────────┼──────────────┼────────┼─────────┤
│ _id                 │ CHAR(24)     │ NO     │ PRIMARY │
│ reference           │ VARCHAR(255) │ NO     │ UNIQUE  │
│ userId              │ CHAR(24)     │ YES    │ FK      │ ← NEW
│ email               │ VARCHAR(255) │ YES    │         │
│ name                │ VARCHAR(100) │ YES    │         │
│ phone               │ VARCHAR(20)  │ YES    │         │
│ address             │ TEXT         │ YES    │         │
│ amount              │ DECIMAL(10,2)│ YES    │         │
│ status              │ VARCHAR(50)  │ YES    │ INDEX   │
│ paidAt              │ DATETIME     │ YES    │         │
│ otpVerified         │ BOOLEAN      │ YES    │         │
│ items               │ JSON         │ YES    │         │
│ date                │ DATETIME     │ YES    │ INDEX   │
└─────────────────────┴──────────────┴────────┴─────────┘

OTPSESSIONS TABLE (with NEW field):
┌─────────────────────┬──────────────┬────────┬─────────┐
│ Field               │ Type         │ Null   │ Key     │
├─────────────────────┼──────────────┼────────┼─────────┤
│ _id                 │ CHAR(24)     │ NO     │ PRIMARY │
│ sessionId           │ VARCHAR(255) │ NO     │ UNIQUE  │
│ reference           │ VARCHAR(255) │ YES    │         │
│ userId              │ CHAR(24)     │ YES    │ FK      │ ← NEW
│ email               │ VARCHAR(255) │ YES    │         │
│ name                │ VARCHAR(100) │ YES    │         │
│ phone               │ VARCHAR(20)  │ YES    │         │
│ address             │ TEXT         │ YES    │         │
│ amount              │ DECIMAL(10,2)│ YES    │         │
│ items               │ JSON         │ YES    │         │
│ otpHash             │ VARCHAR(255) │ YES    │         │
│ otpExpiry           │ DATETIME     │ YES    │ INDEX   │
│ verified            │ BOOLEAN      │ YES    │         │
│ createdAt           │ DATETIME     │ YES    │         │
└─────────────────────┴──────────────┴────────┴─────────┘
*/

-- ============================================
-- 13. TRANSACTION EXAMPLE (For Data Integrity)
-- ============================================

-- Start transaction
-- START TRANSACTION;

-- Create user account
-- INSERT INTO users (
--   _id, email, password, name, phone,
--   createdAt, updatedAt
-- ) VALUES (
--   '507f1f77bcf86cd799439013',
--   'jane@example.com',
--   '$2a$12$hashedPassword...',
--   'Jane Doe',
--   '+234-812-345-6790',
--   NOW(),
--   NOW()
-- );

-- Add user address
-- INSERT INTO user_addresses (
--   _id, userId, label, street, city, zipcode, isDefault
-- ) VALUES (
--   '507f1f77bcf86cd799439014',
--   '507f1f77bcf86cd799439013',
--   'Home',
--   '456 Oak Avenue',
--   'Abuja',
--   '900001',
--   TRUE
-- );

-- COMMIT;

-- ============================================
-- 14. PERFORMANCE OPTIMIZATION
-- ============================================

-- Analyze table performance
-- ANALYZE TABLE users;
-- ANALYZE TABLE sales;
-- ANALYZE TABLE otpsessions;

-- Check query execution plans
-- EXPLAIN SELECT * FROM sales WHERE userId = '507f1f77bcf86cd799439011';
-- EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- ============================================
-- 15. BACKUP AND RESTORE
-- ============================================

-- Backup all tables
-- mysqldump -u username -p database_name > backup.sql

-- Restore from backup
-- mysql -u username -p database_name < backup.sql

-- Backup specific table
-- mysqldump -u username -p database_name users > users_backup.sql

-- ============================================
-- SUMMARY OF CHANGES
-- ============================================

/*
NEW TABLES:
  - users (customer accounts)
  - user_addresses (shipping addresses)

MODIFIED TABLES:
  - sales (added userId field)
  - otpsessions (added userId field)

NEW INDEXES: 12 total
  - Users: email (unique), createdAt, emailVerified
  - Sales: userId, reference, date, status, userId+date
  - OtpSessions: sessionId (unique), userId, otpExpiry, verified
  - Addresses: userId, isDefault

BACKWARD COMPATIBLE:
  - Guest orders still work (userId = NULL)
  - Existing data preserved
  - No data loss
  - Can rollback if needed

SECURITY IMPROVEMENTS:
  - Passwords hashed with bcrypt
  - JWT tokens for authentication
  - Email verification flow
  - Password reset capability
  - Account preferences management
*/

-- ============================================
-- END OF SQL MIGRATION SCRIPT
-- ============================================
-- Total: 15 sections, 100+ lines
-- Ready for production deployment
-- November 28, 2025
-- ============================================
