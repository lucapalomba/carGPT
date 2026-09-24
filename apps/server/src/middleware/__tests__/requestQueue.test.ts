import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const queueConfig = {
  concurrency: 1,
  timeout: 50,
  maxQueueSize: 1,
};

vi.mock('../../config/index.js', () => ({
  config: {
    rateLimit: {
      ollamaQueue: queueConfig,
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  default: mockLogger,
}));

const makeReq = (overrides: Partial<Request> = {}): Request => ({
  ip: '127.0.0.1',
  sessionID: 'session-1',
  originalUrl: '/api/find-cars',
  ...overrides,
} as unknown as Request);

const makeRes = (): Response => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
} as unknown as Response);

describe('requestQueue middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Ensure prototype spies from the timeout/error tests never leak
    vi.restoreAllMocks();
    queueConfig.maxQueueSize = 1;
  });

  it('runs the task, attaches queue info and calls next on success', async () => {
    const { queueOllamaRequest } = await import('../requestQueue.js');
    const req = makeReq();
    const next = vi.fn();

    queueOllamaRequest(req, makeRes(), next);

    await vi.waitFor(() => expect(next).toHaveBeenCalled(), { timeout: 1000 });
    expect(req.queueInfo).toBeDefined();
    expect(req.queueInfo?.queuedAt).toBeTypeOf('number');
  });

  it('rejects with 503 when the queue is over the configured size', async () => {
    const { queueOllamaRequest } = await import('../requestQueue.js');
    const { config } = await import('../../config/index.js');
    (config.rateLimit.ollamaQueue as { maxQueueSize: number }).maxQueueSize = -1;

    const res = makeRes();
    const next = vi.fn();
    queueOllamaRequest(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, retryAfter: '30 seconds' })
    );
    expect(next).not.toHaveBeenCalled();

    (config.rateLimit.ollamaQueue as { maxQueueSize: number }).maxQueueSize = 1;
  });

  it('returns 504 when the queued task times out', async () => {
    const { queueOllamaRequest } = await import('../requestQueue.js');
    const PQueue = (await import('p-queue')).default;

    // Force the queued task to exceed the timeout by occupying the single slot
    // with a long-running task while a second request waits behind it.
    const originalAdd = PQueue.prototype.add;
    const addSpy = vi.spyOn(PQueue.prototype, 'add').mockImplementation(function (this: InstanceType<typeof PQueue>, task: any) {
      const guarded = async () => {
        await new Promise(resolve => setTimeout(resolve, (queueConfig.timeout as number) + 100));
        return task();
      };
      return originalAdd.call(this, guarded);
    });

    const res = makeRes();
    const next = vi.fn();

    // First request occupies the worker
    queueOllamaRequest(makeReq(), makeRes(), vi.fn());
    // Second request waits and should time out
    queueOllamaRequest(makeReq(), res, next);

    await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(504), { timeout: 2000 });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, retryAfter: '60 seconds' })
    );
    expect(next).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });

  it('forwards non-timeout errors to next', async () => {
    const { queueOllamaRequest } = await import('../requestQueue.js');
    const PQueue = (await import('p-queue')).default;

    const addSpy = vi.spyOn(PQueue.prototype, 'add').mockRejectedValue(new Error('boom'));

    const res = makeRes();
    const next = vi.fn();
    queueOllamaRequest(makeReq(), res, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(Error)), { timeout: 2000 });
    expect(res.status).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });

  it('reports queue stats', async () => {
    const { getQueueStats } = await import('../requestQueue.js');
    const stats = getQueueStats();

    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('isPaused');
  });
});
