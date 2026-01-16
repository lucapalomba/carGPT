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
