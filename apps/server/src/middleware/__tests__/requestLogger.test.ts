import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requestLogger, responseTimeMiddleware, requestIdMiddleware } from '../requestLogger.js';

// Mock morgan
vi.mock('morgan', () => {
  const morganMock = vi.fn(() => (req: Request, res: Response, next: NextFunction) => next());
  (morganMock as any).token = vi.fn();
  return {
    default: morganMock
  };
});

import morgan from 'morgan';

// Capture calls made at import time (before any clearAllMocks in beforeEach).
const importTimeTokenCalls = (morgan.token as any).mock.calls.slice();
const importTimeMorganCalls = (morgan as any).mock.calls.slice();

// Mock logger stream
vi.mock('../../utils/logger.js', () => ({
  stream: {
    write: vi.fn()
  }
}));

describe('Request Logger Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      sessionID: 'session-123'
    };
    
    mockRes = {
      statusCode: 200,
      on: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestLogger', () => {
    it('should be defined', () => {
      expect(requestLogger).toBeDefined();
    });
    
    // Note: since requestLogger is created at module load time with the mock,
    // we can't easily test the internal logic of morgan without re-importing or using doMock.
    // For now, let's just ensure it's a function (middleware).
    it('should be a function', () => {
      expect(typeof requestLogger).toBe('function');
    });

    it('should register the custom session-id and request-id tokens', () => {
      const sessionToken = importTimeTokenCalls.find((call: unknown[]) => call[0] === 'session-id');
      const requestToken = importTimeTokenCalls.find((call: unknown[]) => call[0] === 'request-id');

      expect(sessionToken).toBeDefined();
      expect(requestToken).toBeDefined();

      expect(sessionToken[1]({ sessionID: 'abc' })).toBe('abc');
      expect(sessionToken[1]({})).toBe('-');

      expect(requestToken[1]({ id: 'req-1' })).toBe('req-1');
      expect(requestToken[1]({})).toBe('-');
    });

    it('should skip logging for the health endpoint and keep other URLs', () => {
      const options = importTimeMorganCalls[0][1];
      expect(options.stream).toBeDefined();
      expect(options.skip({ originalUrl: '/api/health' })).toBe(true);
      expect(options.skip({ originalUrl: '/api/cars' })).toBe(false);
    });
  });

  describe('responseTimeMiddleware', () => {
    it('should set up finish event listener and call next', () => {
      responseTimeMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requestIdMiddleware', () => {
    it('should generate unique request ID and set header', () => {
      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.stringMatching(/^\d{13}-[a-z0-9]{9}$/));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach request ID to request object', () => {
      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).id).toBeDefined();
      expect(typeof (mockReq as any).id).toBe('string');
    });

    it('should call next function', () => {
      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});