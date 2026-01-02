import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Convert common errors to AppError
 */
const normalizeError = (err: unknown): any => {
  // Validation errors (if any from other libraries)
  if (err && typeof err === 'object' && 'name' in err && (err as any).name === 'ValidationError') {
    return new AppError((err as any).message || 'Validation Error', 400);
  }

  // JSON parsing errors
  if (err instanceof SyntaxError && (err as any).status === 400) {
    return new AppError('Invalid JSON in request body', 400);
  }

  return err;
};

/**
 * Main error handling middleware
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let error: any = normalizeError(err);

  // Default to 500 if not an AppError
  if (!(error instanceof AppError)) {
    const originalMessage = error.message || 'Internal Server Error';
    const originalStatusCode = error.statusCode || 500;
    error = new AppError(
      originalMessage,
      originalStatusCode,
      false // Not operational (unexpected)
    );
  }

  // Log error
  const errorLog = {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
    requestId: req.headers['x-request-id']
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error', errorLog);
  } else {
    logger.warn('Client Error', errorLog);
  }

  // Send response
  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(!config.isProduction && { stack: error.stack }),
    ...(!config.isProduction && !error.isOperational && { 
      originalError: (err instanceof Error) ? err.message : String(err)
    })
  });
};

/**
 * 404 handler - must be after all routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404
  );
  next(error);
};

/**
 * Unhandled rejection handler
 */
export const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    });
  });
};

/**
 * Uncaught exception handler
 */
export const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    // For uncaught exceptions, it's safer to exit
    process.exit(1);
  });
};
/* eslint-enable @typescript-eslint/no-explicit-any */
