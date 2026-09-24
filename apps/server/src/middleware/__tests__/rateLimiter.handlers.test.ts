import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Use a tiny limiter so a couple of requests trip the limit and exercise the
// custom handlers, and enable slow-down on the very first request.
vi.mock('../../config/index.js', () => {
  const baseLimiter = { windowMs: 60000, max: 1 };
  return {
    config: {
      rateLimit: {
        enabled: true,
        global: { ...baseLimiter },
        findCars: { ...baseLimiter },
        compareCars: { ...baseLimiter },
        askAboutCar: { ...baseLimiter },
        getAlternatives: { ...baseLimiter },
        refineSearch: { ...baseLimiter },
        health: { ...baseLimiter },
        conversation: { ...baseLimiter },
        slowDown: { windowMs: 60000, delayAfter: 0, delayMs: 100, maxDelayMs: 500 },
        ollamaQueue: { concurrency: 1, timeout: 1000, maxQueueSize: 1 },
      },
    },
  };
});

vi.mock('../../utils/logger.js', () => ({
  default: mockLogger,
}));

const makeReq = (overrides: Partial<Request> = {}): Request => ({
  ip: '127.0.0.1',
  sessionID: 'session-1',
  originalUrl: '/api/find-cars',
  method: 'POST',
  ...overrides,
} as unknown as Request);

const makeRes = (): Response => {
  const res = {
    statusCode: 200,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    end: vi.fn(),
    on: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe('rateLimiter middleware behavior', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('skips when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    const { findCarsLimiter } = await import('../rateLimiter.js');
    const next = vi.fn();

    await findCarsLimiter(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('enforces the limit and emits a 429 with the configured payload', async () => {
    process.env.NODE_ENV = 'production';
    const { findCarsLimiter } = await import('../rateLimiter.js');

    // First request is allowed through
    const firstNext = vi.fn();
    await findCarsLimiter(makeReq(), makeRes(), firstNext);
    expect(firstNext).toHaveBeenCalled();

    // Second request from the same key exceeds max=1
    const res = makeRes();
    const secondNext = vi.fn();
    await findCarsLimiter(makeReq(), res, secondNext);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('Too many AI requests') })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ ip: '127.0.0.1', sessionId: 'session-1' })
    );
    expect(secondNext).not.toHaveBeenCalled();
  });

  it('uses the IP when no session id is present', async () => {
    process.env.NODE_ENV = 'production';
    const { globalLimiter } = await import('../rateLimiter.js');

    const firstNext = vi.fn();
    await globalLimiter(makeReq({ sessionID: undefined }), makeRes(), firstNext);

    const res = makeRes();
    await globalLimiter(makeReq({ sessionID: undefined }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(429);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ ip: '127.0.0.1' })
    );
  });

  it('delays and eventually calls next through the slow-down middleware', async () => {
    process.env.NODE_ENV = 'production';
    const { apiSlowDown } = await import('../rateLimiter.js');
    const next = vi.fn();

    await apiSlowDown(makeReq(), makeRes(), next);

    // express-slow-down defers next() until the configured delay elapses
    await vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('logs once when rate limiting is disabled via config', async () => {
    process.env.NODE_ENV = 'production';
    const configModule = await import('../../config/index.js');
    (configModule.config.rateLimit as { enabled: boolean }).enabled = false;

    const { healthLimiter } = await import('../rateLimiter.js');
    const next = vi.fn();

    await healthLimiter(makeReq(), makeRes(), next);
    await healthLimiter(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith('Rate limiting is disabled');
    const disabledLogs = mockLogger.info.mock.calls.filter(
      ([message]) => message === 'Rate limiting is disabled'
    );
    expect(disabledLogs).toHaveLength(1);

    (configModule.config.rateLimit as { enabled: boolean }).enabled = true;
  });
});
