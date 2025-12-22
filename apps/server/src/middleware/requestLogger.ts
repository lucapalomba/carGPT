import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger, { stream } from '../utils/logger.js';

// Custom Morgan tokens
morgan.token('session-id', (req: Request) => req.sessionID || '-');
morgan.token('request-id', (req: Request) => (req as any).id || '-');

// Custom format: method url status response-time session-id request-id
const morganFormat = ':method :url :status :response-time ms - :session-id - :request-id';

/**
 * Request logging middleware using Morgan and Winston
 */
export const requestLogger = morgan(morganFormat, {
  stream: stream,
  skip: (req: Request) => {
    // Skip logging for health checks to avoid noise
    return req.originalUrl === '/api/health';
  }
});

/**
 * Add response time header
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log duration internally if needed, but don't set headers here
    // as the response is already sent.
    // Morgan is already logging this via :response-time token.
  });

  next();
};

/**
 * Add request ID for correlation
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  (req as any).id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
