/**
 * Base application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public details: unknown;

  constructor(message: string, statusCode = 500, isOperational = true, options?: ErrorOptions) {
    super(message, options);
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
  constructor(message: string, details: unknown = null, options?: ErrorOptions) {
    super(message, 400, true, options);
    this.details = details;
    this.name = 'ValidationError';
  }
}

/**
 * Not Found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', options?: ErrorOptions) {
    super(`${resource} not found`, 404, true, options);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', options?: ErrorOptions) {
    super(message, 401, true, options);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', options?: ErrorOptions) {
    super(message, 403, true, options);
    this.name = 'AuthorizationError';
  }
}

/**
 * External service errors (502/503)
 */
export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message: string, options?: ErrorOptions) {
    super(`${service} service error: ${message}`, 503, true, options);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Ollama specific errors
 */
export class OllamaError extends ExternalServiceError {
  constructor(message: string, options?: ErrorOptions) {
    super('Ollama', message, options);
    this.name = 'OllamaError';
  }
}
