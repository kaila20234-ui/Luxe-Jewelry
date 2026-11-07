// routes/security-middleware.js - CSRF, pagination, sanitization utilities
const xss = require('xss');
const csurf = require('csurf');
const csrf = csurf({ cookie: false });

/**
 * CSRF Protection middleware
 */
const csrfProtection = csrf;

/**
 * Generate CSRF Token endpoint
 */
const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

/**
 * Pagination middleware
 * Usage: app.use(paginationMiddleware); in routes/list endpoints
 * Access via: req.pagination = { page, limit, skip }
 */
const paginationMiddleware = (req, res, next) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 20;

  // Validate and constrain
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(100, limit)); // Max 100 per page

  const skip = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    skip
  };

  next();
};

/**
 * Input Sanitization helper
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input, {
      whiteList: {},
      stripIgnoredTag: true,
      stripLeakedAttrs: true
    });
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * Sanitize request body helper
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
};

/**
 * Response pagination helper
 */
const sendPaginatedResponse = (res, {
  success = true,
  message = '',
  data = [],
  page = 1,
  limit = 20,
  total = 0,
  statusCode = 200
}) => {
  const totalPages = Math.ceil(total / limit);

  res.status(statusCode).json({
    success,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
};

module.exports = {
  csrfProtection,
  getCsrfToken,
  paginationMiddleware,
  sanitizeInput,
  sanitizeRequestBody,
  sendPaginatedResponse
};
