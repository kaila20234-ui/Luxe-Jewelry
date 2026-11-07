// routes/auth.js - Enhanced security with email verification, token rotation, account lockout, 2FA
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const xss = require('xss');
const User = require('../model/user');
const AuditLog = require('../model/auditLog');
const TokenBlacklist = require('../model/tokenBlacklist');
const { sendWelcomeEmail, sendVerificationEmail } = require('./email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

// Utility: Log audit
const logAudit = async (action, userId = null, status = 'success', details = {}, req = null) => {
  try {
    await AuditLog.create({
      action,
      userId,
      status,
      details,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.get('user-agent') || 'unknown'
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log:', err.message);
  }
};

// Utility: Generate JWT with jti (JWT ID for blacklist tracking)
const generateToken = (user) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      jti,
      tokenVersion: user.tokenVersion
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { token, jti, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
};

// Middleware: Verify Customer Token with blacklist check
const verifyCustomerToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('[AUTH] No token provided');
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is blacklisted
    const blacklisted = await TokenBlacklist.findOne({ jti: decoded.jti });
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    if (!decoded.userId) {
      console.error('[AUTH] Token does not have userId field');
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    req.userId = decoded.userId;
    req.tokenJti = decoded.jti;
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Middleware: Optional Customer Token with blacklist check
const optionalVerifyCustomerToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if token is blacklisted
      const blacklisted = await TokenBlacklist.findOne({ jti: decoded.jti });
      if (!blacklisted) {
        req.userId = decoded.userId;
        req.tokenJti = decoded.jti;
      }
    } catch (error) {
      // Token invalid, proceed as guest
      req.userId = null;
    }
  } else {
    req.userId = null;
  }
  next();
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirmPassword, name, phone } = req.body;

    // Validation
    if (!email || !password || !confirmPassword || !name || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      await logAudit('register', null, 'failure', { email: emailLower, reason: 'email_exists' }, req);
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create new user with email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      email: emailLower,
      password,
      name: xss(name),
      phone: xss(phone),
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry
    });

    await user.save();

    // Send verification email
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationLink);
      console.log('[AUTH] Verification email sent to:', user.email);
    } catch (emailErr) {
      console.error('[AUTH] Failed to send verification email:', emailErr.message);
      // Don't fail registration, user can request resend
    }

    await logAudit('register', user._id, 'success', { email: emailLower }, req);

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      user: user.toJSON(),
      requiresEmailVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    await logAudit('register', null, 'failure', { error: error.message }, req);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Verify Email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    await logAudit('email_verification', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationLink);
    } catch (emailErr) {
      console.error('[AUTH] Failed to send verification email:', emailErr.message);
    }

    res.json({ success: true, message: 'Verification email resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend verification' });
  }
});

// Login with account lockout protection
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = (email || '').trim().toLowerCase();

    // Validation
    if (!emailLower || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    console.log('[AUTH-LOGIN] Attempting login for email:', emailLower);

    // Find user and include password field
    let user = await User.findOne({ email: emailLower }).select('+password');
    if (!user) {
      console.log('[AUTH-LOGIN] User not found:', emailLower);
      await logAudit('login_failed', null, 'failure', { email: emailLower, reason: 'user_not_found' }, req);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      await logAudit('login_failed', user._id, 'failure', { reason: 'email_not_verified' }, req);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresEmailVerification: true
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      await logAudit('login_failed', user._id, 'failure', { reason: 'account_locked' }, req);
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Try again later.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('[AUTH-LOGIN] Invalid password for user:', emailLower);
      await user.incrementFailedLoginAttempts();
      await logAudit('login_failed', user._id, 'failure', { reason: 'invalid_password' }, req);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Reset failed login attempts on successful login
    await user.resetFailedLoginAttempts();

    // Generate token
    const { token, jti, expiresAt } = generateToken(user);

    console.log('[AUTH-LOGIN] Login successful for userId:', user._id);
    await logAudit('login_success', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
      requiresTwoFactor: user.twoFactorEnabled
    });
  } catch (error) {
    console.error('[AUTH-LOGIN] Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Verify 2FA Token (TOTP)
router.post('/verify-2fa', verifyCustomerToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: '2FA token required' });
    }

    const user = await User.findById(req.userId).select('+twoFactorSecret');

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      await logAudit('2fa_failed', user._id, 'failure', {}, req);
      return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
    }

    await logAudit('2fa_success', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: '2FA verified successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[2FA] Verification error:', error);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
});

// Enable 2FA
router.post('/enable-2fa', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `Luxe Jewelry (${user.email})`,
      issuer: 'Luxe Jewelry'
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      message: '2FA setup initiated',
      secret: secret.base32,
      qrCode: secret.otpauth_url
    });
  } catch (error) {
    console.error('[2FA] Enable error:', error);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
});

// Confirm 2FA
router.post('/confirm-2fa', verifyCustomerToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: '2FA token required' });
    }

    const user = await User.findById(req.userId).select('+twoFactorSecret');

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await logAudit('2fa_enabled', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[2FA] Confirm error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm 2FA' });
  }
});

// Disable 2FA
router.post('/disable-2fa', verifyCustomerToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const user = await User.findById(req.userId).select('+password');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    await logAudit('2fa_disabled', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: '2FA disabled',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
});

// Refresh token with rotation
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Check if old token is blacklisted
    const blacklisted = await TokenBlacklist.findOne({ jti: decoded.jti });
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify token version matches (for invalidation on password change)
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token version mismatch. Please login again.' });
    }

    // Blacklist old token
    await TokenBlacklist.create({
      jti: decoded.jti,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: 'refresh'
    });

    // Generate new token
    const { token: newToken, jti: newJti, expiresAt } = generateToken(user);

    await logAudit('token_refresh', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: 'Token refreshed',
      token: newToken
    });
  } catch (error) {
    console.error('[AUTH] Refresh error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Change password
router.post('/change-password', verifyCustomerToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' });
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
      await logAudit('password_change', user._id, 'failure', { reason: 'invalid_password' }, req);
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all old tokens
    await user.save();

    // Blacklist current token
    await TokenBlacklist.create({
      jti: req.tokenJti,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: 'password_change'
    });

    await logAudit('password_change', user._id, 'success', {}, req);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
      requiresReLogin: true
    });
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Error:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

// Logout (blacklist current token)
router.post('/logout', verifyCustomerToken, async (req, res) => {
  try {
    await TokenBlacklist.create({
      jti: req.tokenJti,
      userId: req.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: 'logout'
    });

    await logAudit('logout', req.userId, 'success', {}, req);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Admin: Unlock user account
router.post('/admin/unlock-user/:userId', verifyCustomerToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.userId);

    if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = undefined;
    await user.save();

    await logAudit('account_unlocked', user._id, 'success', { unlockedBy: req.userId }, req);

    res.json({ success: true, message: 'User account unlocked' });
  } catch (error) {
    console.error('[UNLOCK] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to unlock account' });
  }
});

module.exports = { router, verifyCustomerToken, optionalVerifyCustomerToken };
