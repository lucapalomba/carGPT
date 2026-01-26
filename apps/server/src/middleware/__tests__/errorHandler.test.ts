import { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler, notFoundHandler, unhandledRejectionHandler, uncaughtExceptionHandler } from '../errorHandler.js';
import { AppError, ValidationError, NotFoundError, AuthenticationError, AuthorizationError, ExternalServiceError, OllamaError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    isProduction: false
  }
}));

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: { test: 'data' },
      query: { param: 'value' },
      params: { id: '123' },
      headers: { 'x-request-id': 'req-123' }
    };
    
    mockRes = {
      status: mockStatus
    } as any;
    
    mockNext = vi.fn();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle AppError correctly', () => {
    const error = new AppError('Test error', 400);
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Test error',
      stack: error.stack
    });
  });

  it('should handle ValidationError with details', () => {
    const details = { field: 'email', message: 'Invalid format' };
    const error = new ValidationError('Validation failed', details);
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    // Note: normalizeError converts ValidationError to plain AppError, so details are lost
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Validation failed',
      stack: expect.any(String)
    });
  });

  it('should handle NotFoundError', () => {
    const error = new NotFoundError('User');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'User not found',
      stack: error.stack
    });
  });

  it('should handle AuthenticationError', () => {
    const error = new AuthenticationError('Invalid credentials');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Invalid credentials',
      stack: error.stack
    });
  });

  it('should handle AuthorizationError', () => {
    const error = new AuthorizationError('Admin access required');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Admin access required',
      stack: error.stack
    });
  });

  it('should handle ExternalServiceError', () => {
    const error = new ExternalServiceError('Payment', 'Service unavailable');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(503);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Payment service error: Service unavailable',
      stack: error.stack
    });
  });

  it('should handle OllamaError', () => {
    const error = new OllamaError('Model not found');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(503);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Ollama service error: Model not found',
      stack: error.stack
    });
  });

  it('should handle generic Error as internal server error', () => {
    const error = new Error('Unexpected error');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Unexpected error',
      stack: expect.any(String),
      originalError: 'Unexpected error'
    });
  });

  it('should handle ValidationError object with name property', () => {
    const validationError = { name: 'ValidationError', message: 'Invalid data' };
    
    errorHandler(validationError, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Invalid data',
      stack: expect.any(String)
    });
  });

  it('should handle JSON SyntaxError', () => {
    const syntaxError = new SyntaxError('Unexpected token');
    (syntaxError as any).status = 400;
    
    errorHandler(syntaxError, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Invalid JSON in request body',
      stack: expect.any(String)
    });
  });

  it('should handle unknown error type', () => {
    const unknownError = { someProperty: 'value' };
    
    errorHandler(unknownError, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Internal Server Error',
      stack: expect.any(String),
      originalError: '[object Object]'
    });
  });

  it('should log client errors with warn level', () => {
    const error = new AppError('Client error', 400);
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect((logger as any).warn).toHaveBeenCalledWith('Client Error', {
      message: 'Client error',
      statusCode: 400,
      stack: error.stack,
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: { test: 'data' },
      query: { param: 'value' },
      params: { id: '123' },
      requestId: 'req-123'
    });
  });

  it('should log server errors with error level', () => {
    const error = new AppError('Server error', 500);
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect((logger as any).error).toHaveBeenCalledWith('Server Error', {
      message: 'Server error',
      statusCode: 500,
      stack: error.stack,
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: { test: 'data' },
      query: { param: 'value' },
      params: { id: '123' },
      requestId: 'req-123'
    });
  });

  it('should handle missing request properties gracefully', () => {
    const error = new AppError('Test error', 400);
    const minimalReq = { originalUrl: '/test', method: 'GET', headers: {}, body: {}, query: {}, params: {} } as Request;
    
    errorHandler(error, minimalReq, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { originalUrl: '/nonexistent' };
    mockRes = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should create 404 error and pass to next middleware', () => {
    notFoundHandler(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    
    const errorArg = (mockNext as any).mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(404);
    expect(errorArg.message).toBe('Route /nonexistent not found');
  });
});

describe('production mode behavior', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock production config
    vi.spyOn(config, 'isProduction', 'get').mockReturnValue(true);

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      body: {},
      query: {},
      params: {},
      headers: {}
    };
    
    mockRes = {
      status: mockStatus
    } as any;
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  it('should not include stack trace in production', () => {
    const error = new AppError('Test error', 400);
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'fail',
      message: 'Test error'
    });
    expect(mockJson).not.toHaveBeenCalledWith(
      expect.objectContaining({ stack: expect.any(String) })
    );
  });

  it('should not include original error in production', () => {
    const error = new Error('Unexpected error');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      status: 'error',
      message: 'Unexpected error'
    });
    expect(mockJson).not.toHaveBeenCalledWith(
      expect.objectContaining({ originalError: expect.any(String) })
    );
  });
});

describe('error handler setup functions', () => {
  let mockProcess: typeof process;

  beforeEach(() => {
    mockProcess = process;
    vi.clearAllMocks();
    // Clean up any existing listeners
    mockProcess.removeAllListeners('unhandledRejection');
    mockProcess.removeAllListeners('uncaughtException');
  });

  it('should set up unhandled rejection listener', () => {
    unhandledRejectionHandler();
    
    expect(mockProcess.listenerCount('unhandledRejection')).toBe(1);
  });

  it('should set up uncaught exception listener', () => {
    uncaughtExceptionHandler();
    
    expect(mockProcess.listenerCount('uncaughtException')).toBe(1);
  });
});