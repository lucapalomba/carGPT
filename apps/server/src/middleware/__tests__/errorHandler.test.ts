import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, unhandledRejectionHandler, uncaughtExceptionHandler } from '../errorHandler.js';
import { AppError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

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

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
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
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError('Test error', 400, true);
      
      errorHandler(
        appError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        status: 'fail',
        message: 'Test error',
        stack: appError.stack
      });
    });

    it('should handle generic Error as 500', () => {
      const genericError = new Error('Generic error');
      
      errorHandler(
        genericError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Generic error',
        stack: expect.stringContaining('Generic error'),
        originalError: 'Generic error'
      });
    });

    it('should handle ValidationError', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Validation failed'
      };
      
      errorHandler(
        validationError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        status: 'fail',
        message: 'Validation failed',
        stack: expect.stringContaining('Validation failed')
      });
    });

    it('should handle JSON SyntaxError', () => {
      const syntaxError = new SyntaxError('Unexpected token');
      (syntaxError as any).status = 400;
      
      errorHandler(
        syntaxError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        status: 'fail',
        message: 'Invalid JSON in request body',
        stack: expect.stringContaining('Invalid JSON in request body')
      });
    });

    it('should log server errors', () => {
      const serverError = new Error('Server error');
      
      errorHandler(
        serverError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith('Server Error', expect.objectContaining({
        message: 'Server error',
        statusCode: 500,
        url: '/test',
        method: 'GET'
      }));
    });

    it('should log client warnings', () => {
      const clientError = new AppError('Client error', 400);
      
      errorHandler(
        clientError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(logger.warn).toHaveBeenCalledWith('Client Error', expect.objectContaining({
        message: 'Client error',
        statusCode: 400,
        url: '/test',
        method: 'GET'
      }));
    });

    it('should include request details in logs', () => {
      mockReq = {
        ...mockReq,
        originalUrl: '/api/test',
        method: 'POST',
        ip: '192.168.1.1',
        body: { test: 'data' },
        query: { param: 'value' },
        params: { id: '123' },
        headers: { 'x-request-id': 'req-123' }
      };
      
      const error = new Error('Test error');
      
      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith('Server Error', expect.objectContaining({
        url: '/api/test',
        method: 'POST',
        ip: '192.168.1.1',
        body: { test: 'data' },
        query: { param: 'value' },
        params: { id: '123' },
        requestId: 'req-123'
      }));
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error and call next', () => {
      notFoundHandler(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: `Route /test not found`,
        statusCode: 404
      }));
    });
  });

  describe('unhandledRejectionHandler', () => {
    it('should set up process listener for unhandled rejections', () => {
      const consoleSpy = vi.spyOn(process, 'on');
      
      unhandledRejectionHandler();
      
      expect(consoleSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });

    it('should log rejection reasons', () => {
      const mockProcessOn = vi.fn();
      const originalOn = process.on;
      process.on = mockProcessOn;
      
      unhandledRejectionHandler();
      
      const rejectionHandler = mockProcessOn.mock.calls.find(call => call[0] === 'unhandledRejection')?.[1];
      
      if (rejectionHandler) {
        const testPromise = Promise.reject('Test rejection');
        rejectionHandler('Test rejection', testPromise);
        
        expect(logger.error).toHaveBeenCalledWith('Unhandled Rejection', {
          reason: 'Test rejection',
          stack: undefined
        });
      }
      
      process.on = originalOn;
    });
  });

  describe('uncaughtExceptionHandler', () => {
    it('should set up process listener for uncaught exceptions', () => {
      const consoleSpy = vi.spyOn(process, 'on');
      
      uncaughtExceptionHandler();
      
      expect(consoleSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });

    it('should log exception and exit process', () => {
      const mockProcessOn = vi.fn();
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const originalOn = process.on;
      process.on = mockProcessOn;
      
      uncaughtExceptionHandler();
      
      const exceptionHandler = mockProcessOn.mock.calls.find(call => call[0] === 'uncaughtException')?.[1];
      
      if (exceptionHandler) {
        const testError = new Error('Test exception');
        exceptionHandler(testError);
        
        expect(logger.error).toHaveBeenCalledWith('Uncaught Exception', {
          message: 'Test exception',
          stack: testError.stack
        });
        expect(mockExit).toHaveBeenCalledWith(1);
      }
      
      process.on = originalOn;
      mockExit.mockRestore();
    });
  });
});