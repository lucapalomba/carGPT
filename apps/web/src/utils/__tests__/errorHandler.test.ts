import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { errorHandler } from '../errorHandler.js';

const mockResponse = (init: {
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
  headers?: Record<string, string | null>;
} = {}): Response => {
  const headers = new Map<string, string | null>();
  for (const [k, v] of Object.entries(init.headers ?? {})) headers.set(k, v);
  return {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: init.json ?? (async () => ({})),
    headers: { get: (name: string) => headers.get(name) ?? null } as any,
  } as Response;
};

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the expected handler surface', () => {
    expect(errorHandler).toBeDefined();
    expect(typeof errorHandler.handleError).toBe('function');
    expect(typeof errorHandler.handleResponseError).toBe('function');
    expect(typeof errorHandler.validateResponse).toBe('function');
  });

  describe('handleError', () => {
    it('toasts the error message for a plain Error', () => {
      errorHandler.handleError(new Error('Something broke'), 'POST /api/x');
      expect(toast.error).toHaveBeenCalledWith('Something broke');
    });

    it('toasts the string directly when given a string', () => {
      errorHandler.handleError('plain string error', 'ctx');
      expect(toast.error).toHaveBeenCalledWith('plain string error');
    });

    it('shows a connection error toast for network-style messages', () => {
      errorHandler.handleError(new Error('Failed to fetch'), 'ctx');
      expect(toast.error).toHaveBeenCalledWith(
        'Connection error. Please check if the server is running.'
      );
    });

    it('falls back to a generic message for unknown error shapes', () => {
      errorHandler.handleError({ weird: true }, 'ctx');
      expect(toast.error).toHaveBeenCalledWith('Unknown error occurred');
    });
  });

  describe('handleResponseError', () => {
    it('handles 429 rate limits with retryAfter and tip', async () => {
      const res = mockResponse({
        status: 429,
        json: async () => ({ error: 'Too many requests', retryAfter: '60s', tip: 'Slow down' }),
      });

      await errorHandler.handleResponseError(res, 'ctx');

      expect(toast.error).toHaveBeenCalledWith(
        'Too many requests Try again after 60s.',
        expect.any(Object)
      );
    });

    it('handles 429 without retryAfter using the default message', async () => {
      const res = mockResponse({ status: 429, json: async () => ({}) });

      await errorHandler.handleResponseError(res, 'ctx');

      expect(toast.error).toHaveBeenCalledWith(
        'Too many requests. Please wait before trying again.',
        expect.any(Object)
      );
    });

    it('handles 503 service unavailable with retryAfter', async () => {
      const res = mockResponse({
        status: 503,
        json: async () => ({ error: 'Server busy', retryAfter: '30s' }),
      });

      await errorHandler.handleResponseError(res, 'ctx');

      expect(toast.error).toHaveBeenCalledWith(
        'Server busy Try again after 30s.',
        expect.any(Object)
      );
    });

    it('extracts the error message from a generic error response body', async () => {
      const res = mockResponse({
        status: 500,
        json: async () => ({ message: 'Server exploded' }),
      });

      await errorHandler.handleResponseError(res, 'ctx');

      expect(toast.error).toHaveBeenCalledWith('Server exploded');
    });

    it('falls back to statusText when the body is not JSON', async () => {
      const res = mockResponse({
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('not json');
        },
      });

      await errorHandler.handleResponseError(res, 'ctx');

      expect(toast.error).toHaveBeenCalledWith('Bad Gateway');
    });
  });

  describe('validateResponse', () => {
    it('passes through success/data/message/error from a structured object', () => {
      const result = errorHandler.validateResponse({
        success: false,
        data: { a: 1 },
        message: 'msg',
        error: 'err',
      });

      expect(result).toEqual({ success: false, data: { a: 1 }, message: 'msg', error: 'err' });
    });

    it('defaults success to true when not specified', () => {
      const result = errorHandler.validateResponse({ foo: 'bar' });
      expect(result.success).toBe(true);
    });

    it('treats non-object input as a successful raw payload', () => {
      const result = errorHandler.validateResponse('raw');
      expect(result.success).toBe(true);
      expect(result.data).toBe('raw');
    });
  });
});