import { describe, it, expect } from 'vitest';
import { AppError } from '../AppError.js';

describe('AppError', () => {
  it('should create an error with correct properties', () => {
    const error = new AppError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });

  it('should set status to "error" for 500 status codes', () => {
    const error = new AppError('Server error', 500);

    expect(error.statusCode).toBe(500);
    expect(error.status).toBe('error');
  });

  it('should capture stack trace', () => {
    const error = new AppError('Error', 400);
    expect(error.stack).toBeDefined();
  });
});

import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError, 
  AuthorizationError, 
  ExternalServiceError, 
  OllamaError 
} from '../AppError.js';

describe('Specialized AppErrors', () => {
  it('ValidationError should have 400 status code and details', () => {
    const details = { field: 'email', message: 'invalid' };
    const error = new ValidationError('Invalid input', details);
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.details).toBe(details);
    expect(error.name).toBe('ValidationError');
  });

  it('NotFoundError should have 404 status code', () => {
    const error = new NotFoundError('Car');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Car not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('AuthenticationError should have 401 status code', () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });

  it('AuthorizationError should have 403 status code', () => {
    const error = new AuthorizationError();
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('AuthorizationError');
  });

  it('ExternalServiceError should have 503 status code', () => {
    const error = new ExternalServiceError('Google', 'Timeout');
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('Google service error');
    expect(error.service).toBe('Google');
    expect(error.name).toBe('ExternalServiceError');
  });

  it('OllamaError should be an ExternalServiceError for Ollama', () => {
    const error = new OllamaError('Connection failed');
    expect(error.statusCode).toBe(503);
    expect(error.service).toBe('Ollama');
    expect(error.name).toBe('OllamaError');
  });
});
