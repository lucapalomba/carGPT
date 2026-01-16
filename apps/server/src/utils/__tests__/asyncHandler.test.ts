import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../asyncHandler.js';
import { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('should call the wrapped function', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;
    const mockFn = vi.fn().mockResolvedValue('success');

    const wrapper = asyncHandler(mockFn);
    await wrapper(req, res, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and call next', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;
    const error = new Error('Async error');
    const mockFn = vi.fn().mockRejectedValue(error);

    const wrapper = asyncHandler(mockFn);
    await wrapper(req, res, next);

    // Promise.resolve might need a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledWith(error);
  });
});
