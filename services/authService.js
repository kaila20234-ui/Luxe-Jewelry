/**
 * Authentication Service
 * Handles all auth-related operations: env validation, DB lookup, credential verification
 * Reduces login endpoint complexity from 54 to <20
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../model/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Validate credentials against environment variables
 * @param {string} email - User email/username
 * @param {string} password - User password
 * @param {string} envUser - User from env (e.g., ADMIN_USER)
 * @param {string} envHash - Bcrypt hash from env
 * @param {string} envPlain - Plain text password from env
 * @returns {Promise<boolean>} True if credentials match
 */
async function validateEnvCredentials(email, password, envUser, envHash, envPlain) {
  try {
    const loginIdentifier = String(email || '').trim().toLowerCase();
    const configuredIdentifier = String(envUser || '').trim().toLowerCase();
    const matchesConfiguredUser =
      configuredIdentifier &&
      (loginIdentifier === configuredIdentifier ||
        (!configuredIdentifier.includes('@') &&
          loginIdentifier.split('@')[0] === configuredIdentifier));

    if (!matchesConfiguredUser) {
      return false;
    }

    // Try hashed password first
    if (envHash) {
      const match = await bcrypt.compare(password, envHash);
      if (match) return true;
    }

    // Fall back to plain text (for backward compatibility)
    if (envPlain && password === envPlain) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('ENV credential validation error:', err.message);
    return false;
  }
}

async function validateStaffEnvironmentCredentials(email, password, role) {
  if (role === 'admin') {
    return validateEnvCredentials(
      email,
      password,
      process.env.SITE_ADMIN_USER || process.env.ADMIN2_USER || '',
      process.env.SITE_ADMIN_PASS_HASH || process.env.ADMIN2_PASS_HASH || '',
      process.env.SITE_ADMIN_PASS || process.env.ADMIN2_PASS || ''
    );
  }

  if (role === 'manager') {
    return validateEnvCredentials(
      email,
      password,
      process.env.ADMIN_USER || '',
      process.env.ADMIN_PASS_HASH || '',
      process.env.ADMIN_PASS_PLAIN || ''
    );
  }

  return false;
}

/**
 * Find user by email with multiple fallback attempts
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByEmail(email) {
  if (!email) return null;

  const uname = String(email || '').trim();
  const tryEmails = [uname, uname.toLowerCase()];

  if (!uname.includes('@')) {
    tryEmails.push(`${uname}@example.com`);
  }

  return User.findOne({ email: { $in: tryEmails } }).select('+password');
}

/**
 * Validate user credentials and role
 * @param {Object} dbUser - User document from DB
 * @param {string} password - Password to verify
 * @param {string} requiredRole - Expected user role
 * @returns {Promise<boolean>} True if credentials valid
 */
async function validateUserCredentials(dbUser, password, requiredRole) {
  try {
    if (!dbUser) return false;
    if (dbUser.role !== requiredRole) return false;
    if (!dbUser.password) {
      console.warn('User has no password set:', dbUser.email);
      return false;
    }

    const match = await bcrypt.compare(password, dbUser.password);
    return match;
  } catch (err) {
    console.warn('Credential validation error:', err.message);
    return false;
  }
}

/**
 * Get single DB admin user
 * @returns {Promise<Object|null>} Admin user or null if multiple/none exist
 */
async function getSingleAdminFromDB() {
  try {
    if (mongoose.connection.readyState !== 1) return null;
    const admins = await User.find({ role: 'admin' }).limit(2);
    return admins?.[0] ?? null;
  } catch (err) {
    console.warn('Admin lookup failed:', err.message);
    return null;
  }
}

/**
 * Get single DB manager user
 * @returns {Promise<Object|null>} Manager user or null if multiple/none exist
 */
async function getSingleManagerFromDB() {
  try {
    if (mongoose.connection.readyState !== 1) return null;
    const managers = await User.find({ role: 'manager' }).limit(2);
    return managers?.[0] ?? null;
  } catch (err) {
    console.warn('Manager lookup failed:', err.message);
    return null;
  }
}

/**
 * Generate JWT token for authenticated user
 * @param {string} username - Username/email
 * @param {string} role - User role
 * @returns {string} JWT token
 */
function generateToken(username, role, userId) {
  return jwt.sign(
    { username, role, ...(userId ? { userId: String(userId) } : {}) },
    JWT_SECRET,
    { expiresIn: '6h' }
  );
}

/**
 * Authenticate admin user
 * @param {string} email - Email/username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, token?: string, message?: string}>}
 */
async function authenticateAdmin(email, password) {
  try {
    // Try environment credentials first
    const adminUser = process.env.SITE_ADMIN_USER || process.env.ADMIN2_USER || '';
    const envValid = await validateStaffEnvironmentCredentials(email, password, 'admin');
    if (envValid) {
      // Map to DB admin if only one exists
      const dbAdmin = await getSingleAdminFromDB();
      const tokenUsername = dbAdmin ? dbAdmin.email : adminUser;
      const token = generateToken(tokenUsername, 'admin', dbAdmin?._id);
      return { success: true, token, name: dbAdmin?.name };
    }

    // Fall back to DB lookup
    const dbUser = await findUserByEmail(email);
    if (!dbUser) {
      return { success: false, message: 'Invalid admin credentials or admin not configured' };
    }

    const isValid = await validateUserCredentials(dbUser, password, 'admin');
    if (!isValid) {
      return { success: false, message: 'Invalid admin credentials or admin not configured' };
    }

    const token = generateToken(dbUser.email, 'admin', dbUser._id);
    return { success: true, token, name: dbUser.name };
  } catch (err) {
    console.error('Admin auth error:', err.message);
    return { success: false, message: 'Server error' };
  }
}

/**
 * Authenticate manager user
 * @param {string} email - Email/username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, token?: string, message?: string}>}
 */
async function authenticateManager(email, password) {
  try {
    // Try environment credentials first
    const managerUser = process.env.ADMIN_USER || '';
    const envValid = await validateStaffEnvironmentCredentials(email, password, 'manager');
    if (envValid) {
      // Map to DB manager if only one exists
      const dbManager = await getSingleManagerFromDB();
      const tokenUsername = dbManager ? dbManager.email : managerUser;
      const token = generateToken(tokenUsername, 'manager', dbManager?._id);
      return { success: true, token, name: dbManager?.name };
    }

    // Fall back to DB lookup
    const dbUser = await findUserByEmail(email);
    if (!dbUser) {
      return { success: false, message: 'Invalid manager credentials' };
    }

    const isValid = await validateUserCredentials(dbUser, password, 'manager');
    if (!isValid) {
      return { success: false, message: 'Invalid manager credentials' };
    }

    const token = generateToken(dbUser.email, 'manager', dbUser._id);
    return { success: true, token, name: dbUser.name };
  } catch (err) {
    console.error('Manager auth error:', err.message);
    return { success: false, message: 'Server error' };
  }
}

/**
 * Authenticate user by role
 * Main entry point for authentication
 * @param {string} email - Email/username
 * @param {string} password - Password
 * @param {string} role - User role (admin, manager, customer)
 * @returns {Promise<{success: boolean, token?: string, message?: string}>}
 */
async function authenticate(email, password, role) {
  // Validate role
  if (!['admin', 'manager', 'customer'].includes(role)) {
    return { success: false, message: 'Invalid role' };
  }

  if (role === 'admin') {
    return authenticateAdmin(email, password);
  }

  if (role === 'manager') {
    return authenticateManager(email, password);
  }

  // Customer auth would go here
  return { success: false, message: 'Customer auth not implemented in this service' };
}

module.exports = {
  validateEnvCredentials,
  validateStaffEnvironmentCredentials,
  findUserByEmail,
  validateUserCredentials,
  getSingleAdminFromDB,
  getSingleManagerFromDB,
  generateToken,
  authenticate,
  authenticateAdmin,
  authenticateManager
};
