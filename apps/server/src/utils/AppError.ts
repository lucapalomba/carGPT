/**
 * Base application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public details: any;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, 400);
    this.details = details;
    this.name = 'ValidationError';
  }
}

/**
 * Not Found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * External service errors (502/503)
 */
export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message: string) {
    super(`${service} service error: ${message}`, 503);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Ollama specific errors
 */
export class OllamaError extends ExternalServiceError {
  constructor(message: string) {
    super('Ollama', message);
    this.name = 'OllamaError';
  }
}
