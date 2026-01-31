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