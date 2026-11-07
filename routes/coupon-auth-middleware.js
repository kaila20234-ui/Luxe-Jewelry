// Security middleware for coupon routes
// Import this file and use: app.use('/api/coupons', couponAuthMiddleware, couponRoutes);

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';

/**
 * Authenticate admin/manager for coupon management
 */
const authenticateJWT = (req, res, next) => {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth) {
      return res.status(401).json({ success: false, message: 'Missing Authorization header' });
    }
    
    const parts = String(auth).split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload.username || null;
    req.role = payload.role || null;
    req.userId = payload.userId || null;
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Verify user role is admin or manager
 */
const verifyAdminRole = (req, res, next) => {
  if (!req.role) {
    return res.status(403).json({ success: false, message: 'No role on token' });
  }
  
  const allowedRoles = ['admin', 'manager'];
  if (!allowedRoles.includes(req.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient privileges - admin/manager required' });
  }
  
  next();
};

/**
 * Validate coupon code format
 */
const validateCouponCode = (req, res, next) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code required' });
  }
  
  // Code: 3-20 chars, alphanumeric + dash/underscore
  if (!/^[A-Z0-9_-]{3,20}$/.test(String(code).toUpperCase())) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid code format (3-20 chars, alphanumeric + dash/underscore)' 
    });
  }
  
  req.body.code = String(code).toUpperCase().trim();
  next();
};

/**
 * Sanitize string input
 */
const sanitize = (str) => {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[<>"']/g, '')  // Remove dangerous chars
    .substring(0, 500);       // Limit length
};

module.exports = {
  authenticateJWT,
  verifyAdminRole,
  validateCouponCode,
  sanitize
};
