/**
 * Error Handler Utility Tests
 * Tests for standardized error and success responses
 */

const errorHandler = require('../utils/errorHandler');

describe('Error Handler Utility', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('successResponse', () => {
    it('should return success response with data', () => {
      const data = { message: 'Success', id: '123' };
      errorHandler.successResponse(mockRes, data, 200);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.id).toBe('123');
      expect(response.timestamp).toBeDefined();
    });

    it('should use default status 200 if not provided', () => {
      errorHandler.successResponse(mockRes, { message: 'OK' });

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should use custom status code', () => {
      errorHandler.successResponse(mockRes, { message: 'Created' }, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('errorResponse', () => {
    it('should return error response with details', () => {
      errorHandler.errorResponse(
        mockRes,
        400,
        'Invalid input',
        errorHandler.ErrorCodes.VALIDATION_ERROR,
        { field: 'email', reason: 'required' }
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid input');
      expect(response.code).toBe(errorHandler.ErrorCodes.VALIDATION_ERROR);
      expect(response.details).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should omit details if not provided', () => {
      errorHandler.errorResponse(
        mockRes,
        400,
        'Bad request',
        errorHandler.ErrorCodes.INVALID_INPUT
      );

      const response = mockRes.json.mock.calls[0][0];
      expect(response.details).toBeUndefined();
    });
  });

  describe('validationError', () => {
    it('should return 400 validation error', () => {
      const details = { field: 'password', message: 'Too short' };
      errorHandler.validationError(mockRes, details);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.code).toBe(errorHandler.ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('authError', () => {
    it('should return 401 auth error', () => {
      errorHandler.authError(mockRes, 'Invalid credentials');

      expect(mockRes.status).toHaveBeenCalledWith(401);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.code).toBe(errorHandler.ErrorCodes.AUTH_ERROR);
      expect(response.message).toBe('Invalid credentials');
    });

    it('should use default message if not provided', () => {
      errorHandler.authError(mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toBe('Authentication failed');
    });
  });

  describe('permissionError', () => {
    it('should return 403 permission error', () => {
      errorHandler.permissionError(mockRes, 'Admin access required');

      expect(mockRes.status).toHaveBeenCalledWith(403);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.code).toBe(errorHandler.ErrorCodes.PERMISSION_ERROR);
    });
  });

  describe('notFoundError', () => {
    it('should return 404 not found error', () => {
      errorHandler.notFoundError(mockRes, 'Product');

      expect(mockRes.status).toHaveBeenCalledWith(404);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toContain('Product');
      expect(response.code).toBe(errorHandler.ErrorCodes.NOT_FOUND);
    });
  });

  describe('conflictError', () => {
    it('should return 409 conflict error', () => {
      errorHandler.conflictError(mockRes, 'Email already exists');

      expect(mockRes.status).toHaveBeenCalledWith(409);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toBe('Email already exists');
      expect(response.code).toBe(errorHandler.ErrorCodes.CONFLICT);
    });
  });

  describe('duplicateError', () => {
    it('should return 409 duplicate error', () => {
      errorHandler.duplicateError(mockRes, 'Email');

      expect(mockRes.status).toHaveBeenCalledWith(409);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toContain('already exists');
      expect(response.code).toBe(errorHandler.ErrorCodes.DUPLICATE_ERROR);
    });
  });

  describe('serverError', () => {
    it('should return 500 server error', () => {
      errorHandler.serverError(mockRes, 'Internal server error');

      expect(mockRes.status).toHaveBeenCalledWith(500);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.code).toBe(errorHandler.ErrorCodes.SERVER_ERROR);
    });

    it('should log error if provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      errorHandler.serverError(mockRes, 'Server error', error);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('paymentError', () => {
    it('should return payment error', () => {
      errorHandler.paymentError(mockRes, 'Payment failed');

      expect(mockRes.status).toHaveBeenCalledWith(400);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.code).toBe(errorHandler.ErrorCodes.PAYMENT_ERROR);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format string errors', () => {
      const result = errorHandler.formatValidationErrors('Invalid input');

      expect(result.message).toBe('Invalid input');
    });

    it('should format array errors', () => {
      const errors = [
        {
          context: { key: 'email' },
          message: 'Invalid email',
          type: 'email'
        }
      ];

      const result = errorHandler.formatValidationErrors(errors);

      expect(result.errors).toBeDefined();
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].message).toBe('Invalid email');
    });

    it('should handle object errors', () => {
      const errors = { field: 'email', message: 'Invalid' };

      const result = errorHandler.formatValidationErrors(errors);

      expect(result).toEqual(errors);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle duplicate key error', () => {
      const dbError = {
        code: 11000,
        keyValue: { email: 'test@test.com' }
      };

      const result = errorHandler.handleDatabaseError(dbError);

      expect(result.code).toBe(errorHandler.ErrorCodes.DUPLICATE_ERROR);
      expect(result.statusCode).toBe(409);
    });

    it('should handle validation error', () => {
      const dbError = {
        name: 'ValidationError',
        errors: { email: 'Required' }
      };

      const result = errorHandler.handleDatabaseError(dbError);

      expect(result.code).toBe(errorHandler.ErrorCodes.VALIDATION_ERROR);
      expect(result.statusCode).toBe(400);
    });

    it('should handle generic database error', () => {
      const dbError = new Error('Database connection failed');

      const result = errorHandler.handleDatabaseError(dbError);

      expect(result.code).toBe(errorHandler.ErrorCodes.SERVER_ERROR);
      expect(result.statusCode).toBe(500);
    });
  });

  describe('stringify', () => {
    it('should stringify error object', () => {
      const error = new Error('Test error');

      const result = errorHandler.stringify(error);

      expect(result).toContain('Error');
      expect(result).toContain('Test error');
    });

    it('should return string as-is', () => {
      const result = errorHandler.stringify('Error message');

      expect(result).toBe('Error message');
    });

    it('should stringify plain objects', () => {
      const obj = { message: 'test' };

      const result = errorHandler.stringify(obj);

      expect(typeof result).toBe('string');
    });
  });

  describe('Error Codes', () => {
    it('should define all error codes', () => {
      expect(errorHandler.ErrorCodes.VALIDATION_ERROR).toBeDefined();
      expect(errorHandler.ErrorCodes.AUTH_ERROR).toBeDefined();
      expect(errorHandler.ErrorCodes.NOT_FOUND).toBeDefined();
      expect(errorHandler.ErrorCodes.CONFLICT).toBeDefined();
      expect(errorHandler.ErrorCodes.SERVER_ERROR).toBeDefined();
    });
  });

  describe('Status Codes', () => {
    it('should define all status codes', () => {
      expect(errorHandler.StatusCodes.OK).toBe(200);
      expect(errorHandler.StatusCodes.CREATED).toBe(201);
      expect(errorHandler.StatusCodes.BAD_REQUEST).toBe(400);
      expect(errorHandler.StatusCodes.UNAUTHORIZED).toBe(401);
      expect(errorHandler.StatusCodes.FORBIDDEN).toBe(403);
      expect(errorHandler.StatusCodes.NOT_FOUND).toBe(404);
      expect(errorHandler.StatusCodes.CONFLICT).toBe(409);
      expect(errorHandler.StatusCodes.SERVER_ERROR).toBe(500);
    });
  });
});
