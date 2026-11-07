// routes/auth.js - Customer authentication routes
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const xss = require('xss');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../model/user');
const TokenBlacklist = require('../model/tokenBlacklist');
// const { isTokenBlacklisted, blacklistToken } = require('../middleware/redisTokenBlacklist');
const AuditLog = require('../model/auditLog');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } = require('./email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

// Middleware: Verify Customer Token
const verifyCustomerToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('[AUTH] No token provided');
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ensure token has expected payload
    if (!decoded.userId) {
      console.error('[AUTH] Token missing userId');
      return res.status(401).json({ success: false, message: 'Invalid token format. Please log in again.' });
    }

    // Check if user account is suspended and is a customer
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('[AUTH] User not found for userId:', decoded.userId);
      return res.status(401).json({ success: false, message: 'User account not found' });
    }

    if (user.role !== 'customer') {
      console.log('[AUTH] Access denied - non-customer role for userId:', decoded.userId, 'role:', user.role);
      return res.status(403).json({ success: false, message: 'Customer access required' });
    }

    if (user.suspended) {
      console.log('[AUTH] Access denied - account suspended for userId:', decoded.userId);
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been suspended. Please contact support.',
        suspended: true,
        suspensionReason: user.suspensionReason
      });
    }

    // Redis token blacklist disabled

    req.userId = decoded.userId;
    // Extract jti if present (some tokens use 'jti' or 'jwtid')
    const jti = decoded.jti || decoded.jwtid || null;
    if (jti) req.tokenJti = jti;
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Middleware: Optional Customer Token (for checkout flow - customer can be logged in or guest)
const optionalVerifyCustomerToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Redis token blacklist disabled
    req.userId = decoded.userId || null;
  } catch (error) {
    req.userId = null;
  }

  next();
};

async function generateReferralCode() {
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const existing = await User.findOne({ referralCode: code });
  if (existing) {
    return generateReferralCode();
  }
  return code;
}

// Register
router.post('/register', async (req, res) => {
  try {
    let { email, password, confirmPassword, name, phone, referrerCode } = req.body;

    // Basic input sanitization
    email = xss(String(email || '').trim().toLowerCase());
    name = xss(String(name || '').trim());
    phone = xss(String(phone || '').trim());
    referrerCode = xss(String(referrerCode || '').trim().toUpperCase());

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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const isDev = process.env.NODE_ENV !== 'production';

    // Create new user (email not verified yet)
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    let referredByUser = null;
    if (referrerCode) {
      referredByUser = await User.findOne({ referralCode: referrerCode });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      phone,
      emailVerified: isDev ? true : false, // Auto-verify in dev for easier testing
      verificationToken,
      verificationTokenExpiry: verificationExpiry,
      referralCode: await generateReferralCode(),
      referredBy: referredByUser ? referredByUser._id : null
    });

    await user.save();

    if (referredByUser) {
      try {
        referredByUser.referralCount = (referredByUser.referralCount || 0) + 1;
        referredByUser.referrals = referredByUser.referrals || [];
        referredByUser.referrals.push(user._id);
        await referredByUser.save();

        // Apply milestone reward when referrer reaches configured thresholds.
        const { applyReferralMilestoneReward } = require('../services/referralRewards');
        await applyReferralMilestoneReward(referredByUser._id, referredByUser.referralCount);
      } catch (e) {
        console.warn('[REFERRAL] Failed to update referrer data', e.message || e);
      }
    }

    // Audit log: registration
    try { await AuditLog.create({ userId: user._id, action: 'register', status: 'success', ipAddress: req.ip, userAgent: req.headers['user-agent'] }); } catch (e) { console.warn('[AUDIT] register log failed', e.message || e); }

    // Send verification email
    const frontend = process.env.FRONTEND_ORIGIN || `http://localhost:${process.env.PORT || 5000}`;
    const verificationLink = `${frontend}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    let emailResult = { success: false };
    try {
      emailResult = await sendVerificationEmail(user.email, user.name, verificationLink);
    } catch (err) {
      console.error('[AUTH] Error sending verification email:', err.message || err);
    }

    // Do not auto-login; require email verification first
    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email before logging in.',
      user: user.toJSON(),
      emailSent: emailResult.success || false
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    const emailLower = xss((email || '').trim().toLowerCase());

    // Validation
    if (!emailLower || !password) {
      console.log('[AUTH-LOGIN] Missing email or password');
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    console.log('[AUTH-LOGIN] Attempting login for email:', emailLower);

    // Find user by email and include password field
    const user = await User.findOne({ email: emailLower }).select('+password');
    if (!user) {
      console.log('[AUTH-LOGIN] User not found with email:', emailLower);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('[AUTH-LOGIN] User found:', user._id, user.email, user.name);

    // Check if account is suspended
    if (user.suspended) {
      console.log('[AUTH-LOGIN] Account suspended for user:', emailLower);
      try { await AuditLog.create({ userId: user._id, action: 'login_denied', status: 'blocked', details: { reason: 'account_suspended', suspensionReason: user.suspensionReason }, ipAddress: req.ip }); } catch(e){ }
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.', suspended: true, suspensionReason: user.suspensionReason });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('[AUTH-LOGIN] Invalid password for user:', emailLower);
      // increment failed login attempts
      await user.incrementFailedLoginAttempts();
      try { await AuditLog.create({ userId: user._id, action: 'login_failed', status: 'failure', ipAddress: req.ip }); } catch(e){ }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Prevent login if email not verified (except in development)
    const isDev2 = process.env.NODE_ENV !== 'production';
    if (!user.emailVerified && !isDev2) {
      return res.status(401).json({ success: false, message: 'Email not verified. Please check your inbox.' });
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      await user.resetFailedLoginAttempts();
    }

    // If 2FA is enabled, require second factor before issuing JWT
    if (user.twoFactorEnabled) {
      // Issue a short-lived temporary token to proceed with TOTP verification
      const tempToken = jwt.sign({ userId: user._id, twoFactor: true }, JWT_SECRET, { expiresIn: '5m' });
      try { await AuditLog.create({ userId: user._id, action: 'login_success', status: 'success', details: { twoFactorRequired: true }, ipAddress: req.ip }); } catch(e){}
      return res.json({ success: true, message: 'Two-factor authentication required', twoFactorRequired: true, tempToken });
    }

    // Generate token with a unique jti
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d', jwtid: jti });

    try { await AuditLog.create({ userId: user._id, action: 'login_success', status: 'success', ipAddress: req.ip }); } catch(e){}

    console.log('[AUTH-LOGIN] Login successful. Token generated for userId:', user._id, 'jti:', jti);

    res.json({ success: true, message: 'Login successful', token, user: user.toJSON() });
  } catch (error) {
    console.error('[AUTH-LOGIN] Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Login 2FA verification (complete login after TOTP)
router.post('/login/2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ success: false, message: 'Missing tempToken or code' });

    let payload;
    try { payload = jwt.verify(tempToken, JWT_SECRET); } catch (err) { return res.status(401).json({ success: false, message: 'Invalid or expired temp token' }); }
    if (!payload.twoFactor || !payload.userId) return res.status(400).json({ success: false, message: 'Invalid temp token' });

    const user = await User.findById(payload.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA not enabled for this user' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: String(code).trim(), window: 1 });
    if (!verified) {
      try { await AuditLog.create({ userId: user._id, action: 'login_failed', status: 'failure', ipAddress: req.ip }); } catch(e){}
      return res.status(401).json({ success: false, message: 'Invalid authentication code' });
    }

    // Successful 2FA: issue normal JWT
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d', jwtid: jti });
    try { await AuditLog.create({ userId: user._id, action: 'login_success', status: 'success', details: { twoFactor: true }, ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, message: '2FA successful', token });
  } catch (err) {
    console.error('[AUTH-2FA] Error:', err);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
});

// Verify email (link from verification email)
router.get('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ success: false, message: 'Missing token or email' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase(), verificationToken: token });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification link' });
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification link expired' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    // Audit log: email verification
    try { await AuditLog.create({ userId: user._id, action: 'email_verification', status: 'success', ipAddress: req.ip }); } catch (e) { console.warn('[AUDIT] email_verification log failed', e.message || e); }

    // Optionally send a welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (e) {
      console.warn('[AUTH] Welcome email failed after verification:', e.message || e);
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[AUTH-VERIFY] Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// 2FA setup - returns QR code image and secret (user must be authenticated)
router.post('/2fa/setup', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `Luxe Jewelry (${user.email})` });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false; // enable after verification
    await user.save();

    const otpauth = secret.otpauth_url;
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    res.json({ success: true, otpauth, qr: qrDataUrl });
  } catch (err) {
    console.error('[2FA-SETUP] Error:', err);
    res.status(500).json({ success: false, message: '2FA setup failed' });
  }
});

// 2FA verify and enable (after setup)
router.post('/2fa/verify', verifyCustomerToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Missing code' });

    const user = await User.findById(req.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) return res.status(400).json({ success: false, message: '2FA not configured' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: String(code).trim(), window: 1 });
    if (!verified) return res.status(401).json({ success: false, message: 'Invalid code' });

    user.twoFactorEnabled = true;
    await user.save();
    try { await AuditLog.create({ userId: user._id, action: 'two_factor_enabled', status: 'success', ipAddress: req.ip }); } catch(e){}

    res.json({ success: true, message: '2FA enabled' });
  } catch (err) {
    console.error('[2FA-VERIFY] Error:', err);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
});

// 2FA disable (requires password)
router.post('/2fa/disable', verifyCustomerToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid password' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    try { await AuditLog.create({ userId: user._id, action: 'two_factor_disabled', status: 'success', ipAddress: req.ip }); } catch(e){}

    res.json({ success: true, message: '2FA disabled' });
  } catch (err) {
    console.error('[2FA-DISABLE] Error:', err);
    res.status(500).json({ success: false, message: 'Could not disable 2FA' });
  }
});

// Refresh token: blacklist old token jti and issue a new token with new jti
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // If token was already blacklisted, deny
    const oldJti = decoded.jti || decoded.jwtid || null;
    if (oldJti) {
      let existing = null;
      const redisResult = await isTokenBlacklisted(oldJti);
      if (redisResult === true) return res.status(401).json({ success: false, message: 'Refresh token revoked' });
      else if (redisResult === null) {
        existing = await TokenBlacklist.findOne({ jti: oldJti });
        if (existing) return res.status(401).json({ success: false, message: 'Refresh token revoked' });
      }
    }

    // Blacklist old token jti
    if (oldJti && decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      try {
        const redisOk = await blacklistToken(oldJti, expiresAt);
        if (!redisOk) {
          await TokenBlacklist.create({ jti: oldJti, expiresAt });
        }
      } catch (err) {
        console.warn('[AUTH-REFRESH] Could not blacklist old jti:', err.message || err);
      }
    }

    // Issue a new token with new jti
    const newJti = crypto.randomBytes(16).toString('hex');
    const newToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, JWT_SECRET, { expiresIn: '7d', jwtid: newJti });

    res.json({ success: true, message: 'Token refreshed', token: newToken });
  } catch (error) {
    console.error('[AUTH-REFRESH] Error:', error.message || error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Logout - blacklist current token jti
router.post('/logout', verifyCustomerToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const jti = decoded.jti || decoded.jwtid || null;
    if (!jti) return res.status(400).json({ success: false, message: 'Token does not contain jti' });

    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // Try Redis first, fallback to Mongo
    const redisOk = await blacklistToken(jti, expiresAt);
    if (!redisOk) {
      await TokenBlacklist.create({ jti, expiresAt });
    }
    try { await AuditLog.create({ userId: req.userId, action: 'logout', status: 'success', ipAddress: req.ip }); } catch(e){}

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[AUTH-LOGOUT] Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Change password (requires authentication)
router.post('/change-password', verifyCustomerToken, async (req, res) => {
  try {
    console.log('[CHANGE-PASSWORD] Request from userId:', req.userId);
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    // Get user with password field
    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      console.log('[CHANGE-PASSWORD] Current password incorrect for userId:', req.userId);
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('[CHANGE-PASSWORD] Password changed successfully for userId:', req.userId);
    try { await AuditLog.create({ userId: req.userId, action: 'password_change', status: 'success', ipAddress: req.ip }); } catch(e){}
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Error:', error);
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
});

// ========== PASSWORD RECOVERY ENDPOINTS ==========

// Forgot Password - Request Password Reset Token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // For security reasons, always respond with success message even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      console.log('[FORGOT-PASSWORD] User not found for email:', email.toLowerCase());
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent' 
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token expiry to 1 hour from now
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save hashed token to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetTokenExpiry = tokenExpiry;
    await user.save();

    console.log('[FORGOT-PASSWORD] Reset token generated for user:', email.toLowerCase());

    // Build reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password.html?token=${resetToken}`;

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetLink);

    if (emailResult.success) {
      console.log('[FORGOT-PASSWORD] Reset email sent successfully to:', user.email);
      try { 
        await AuditLog.create({ 
          userId: user._id, 
          action: 'password_reset_requested', 
          status: 'success', 
          ipAddress: req.ip 
        }); 
      } catch(e){}
      
      res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent' 
      });
    } else {
      console.log('[FORGOT-PASSWORD] Failed to send reset email:', emailResult.error);
      try { 
        await AuditLog.create({ 
          userId: user._id, 
          action: 'password_reset_requested', 
          status: 'failed', 
          details: { reason: 'email_send_failed' },
          ipAddress: req.ip 
        }); 
      } catch(e){}

      res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent' 
      });
    }
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Error:', error);
    res.status(500).json({ success: false, message: 'Error processing password reset request' });
  }
});

// Reset Password - Verify Token and Update Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate password requirements
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Check password strength requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must contain uppercase, lowercase, and number' 
      });
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and valid expiry
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      console.log('[RESET-PASSWORD] Invalid or expired token');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired password reset link. Please request a new one.' 
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    console.log('[RESET-PASSWORD] Password reset successfully for user:', user.email);

    try { 
      await AuditLog.create({ 
        userId: user._id, 
        action: 'password_reset_completed', 
        status: 'success', 
        ipAddress: req.ip 
      }); 
    } catch(e){}

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('[RESET-PASSWORD] Error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Verify Reset Token - Check if token is still valid
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is not expired
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      console.log('[VERIFY-RESET-TOKEN] Invalid or expired token');
      return res.json({ 
        success: false, 
        message: 'Invalid or expired password reset link' 
      });
    }

    console.log('[VERIFY-RESET-TOKEN] Token is valid');
    res.json({ 
      success: true, 
      message: 'Token is valid. You can reset your password.' 
    });
  } catch (error) {
    console.error('[VERIFY-RESET-TOKEN] Error:', error);
    res.status(500).json({ success: false, message: 'Error verifying token' });
  }
});

module.exports = { router, verifyCustomerToken, optionalVerifyCustomerToken };
