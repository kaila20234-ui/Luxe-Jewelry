/**
 * Error Handler Utility
 * Standardizes error and success responses across all endpoints
 */

// Standard error codes
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  INVALID_INPUT: 'INVALID_INPUT'
};

// HTTP Status Codes
const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code (from ErrorCodes)
 * @param {Object} details - Additional error details (optional)
 * @returns {void}
 */
function errorResponse(res, statusCode, message, code, details = null) {
  const response = {
    success: false,
    message: message,
    code: code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {void}
 */
function successResponse(res, data, statusCode = StatusCodes.OK) {
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  };

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Object|string} details - Validation error details
 * @returns {void}
 */
function validationError(res, details) {
  return errorResponse(
    res,
    StatusCodes.BAD_REQUEST,
    'Validation failed',
    ErrorCodes.VALIDATION_ERROR,
    details
  );
}

/**
 * Send authentication error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Authentication failed')
 * @returns {void}
 */
function authError(res, message = 'Authentication failed') {
  return errorResponse(
    res,
    StatusCodes.UNAUTHORIZED,
    message,
    ErrorCodes.AUTH_ERROR
  );
}

/**
 * Send permission error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Permission denied')
 * @returns {void}
 */
function permissionError(res, message = 'Permission denied') {
  return errorResponse(
    res,
    StatusCodes.FORBIDDEN,
    message,
    ErrorCodes.PERMISSION_ERROR
  );
}

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (default: 'Resource')
 * @returns {void}
 */
function notFoundError(res, resource = 'Resource') {
  return errorResponse(
    res,
    StatusCodes.NOT_FOUND,
    `${resource} not found`,
    ErrorCodes.NOT_FOUND
  );
}

/**
 * Send conflict error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {void}
 */
function conflictError(res, message) {
  return errorResponse(
    res,
    StatusCodes.CONFLICT,
    message,
    ErrorCodes.CONFLICT
  );
}

/**
 * Send duplicate error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 * @returns {void}
 */
function duplicateError(res, resource = 'Item') {
  return errorResponse(
    res,
    StatusCodes.CONFLICT,
    `${resource} already exists`,
    ErrorCodes.DUPLICATE_ERROR
  );
}

/**
 * Send server error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (default: 'Server error')
 * @param {Object} err - Error object for logging (optional)
 * @returns {void}
 */
function serverError(res, message = 'Server error', err = null) {
  if (err) {
    console.error('[SERVER ERROR]', err.message || err);
  }
  return errorResponse(
    res,
    StatusCodes.SERVER_ERROR,
    message,
    ErrorCodes.SERVER_ERROR
  );
}

/**
 * Send payment error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {void}
 */
function paymentError(res, message) {
  return errorResponse(
    res,
    StatusCodes.BAD_REQUEST,
    message,
    ErrorCodes.PAYMENT_ERROR
  );
}

/**
 * Format validation errors from Joi or custom validators
 * @param {Array|Object|string} errors - Errors to format
 * @returns {Object} Formatted errors
 */
function formatValidationErrors(errors) {
  if (typeof errors === 'string') {
    return { message: errors };
  }

  if (Array.isArray(errors)) {
    return {
      errors: errors.map(err => ({
        field: err.context?.key || err.path?.join('.') || 'unknown',
        message: err.message,
        type: err.type
      }))
    };
  }

  if (typeof errors === 'object') {
    return errors;
  }

  return { message: 'Validation failed' };
}

/**
 * Handle database operation errors
 * @param {Error} err - Database error
 * @returns {Object} Formatted error
 */
function handleDatabaseError(err) {
  if (err.code === 11000) {
    // Duplicate key error
    const field = Object.keys(err.keyValue)[0];
    return {
      code: ErrorCodes.DUPLICATE_ERROR,
      message: `${field} already exists`,
      statusCode: StatusCodes.CONFLICT
    };
  }

  if (err.name === 'ValidationError') {
    // Mongoose validation error
    return {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Database validation failed',
      statusCode: StatusCodes.BAD_REQUEST,
      details: err.errors
    };
  }

  return {
    code: ErrorCodes.SERVER_ERROR,
    message: 'Database operation failed',
    statusCode: StatusCodes.SERVER_ERROR,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  };
}

/**
 * Safely stringify error for logging
 * @param {Error|string} err - Error object or message
 * @returns {string} Formatted error string
 */
function stringify(err) {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return JSON.stringify(err);
}

module.exports = {
  // Error codes
  ErrorCodes,
  StatusCodes,

  // Response functions
  errorResponse,
  successResponse,
  validationError,
  authError,
  permissionError,
  notFoundError,
  conflictError,
  duplicateError,
  serverError,
  paymentError,

  // Helper functions
  formatValidationErrors,
  handleDatabaseError,
  stringify
};
