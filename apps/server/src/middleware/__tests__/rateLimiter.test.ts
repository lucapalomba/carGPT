import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';

describe('Rate Limiter Config', () => {
  it('should have rateLimit configuration in config', async () => {
    const { config } = await import('../../config/index.js');
    
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.rateLimit.global).toBeDefined();
    expect(config.rateLimit.findCars).toBeDefined();
    expect(config.rateLimit.ollamaQueue).toBeDefined();
  });

  it('should have configurable rate limits', async () => {
    const { config } = await import('../../config/index.js');
    
    // Check config structure and types
    expect(config.rateLimit.global.max).toBeGreaterThan(0);
    expect(config.rateLimit.global.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.findCars.max).toBeGreaterThan(0);
    expect(config.rateLimit.ollamaQueue.concurrency).toBeGreaterThan(0);
    expect(config.rateLimit.ollamaQueue.timeout).toBeGreaterThan(0);
  });
});

describe('Request Queue', () => {
  it('should export queue functions', async () => {
    const { queueOllamaRequest, getQueueStats } = await import('../requestQueue.js');

    expect(queueOllamaRequest).toBeDefined();
    expect(typeof queueOllamaRequest).toBe('function');
    
    expect(getQueueStats).toBeDefined();
    expect(typeof getQueueStats).toBe('function');
  });

  it('should return valid queue stats', async () => {
    const { getQueueStats } = await import('../requestQueue.js');
    
    const stats = getQueueStats();
    
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('isPaused');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.pending).toBe('number');
    expect(typeof stats.isPaused).toBe('boolean');
  });

  it('queueOllamaRequest should call next on success', async () => {
    const { queueOllamaRequest } = await import('../requestQueue.js');
    
    const mockReq = {
      method: 'POST',
      originalUrl: '/api/find-cars',
      sessionID: 'test-session',
      ip: '127.0.0.1'
    } as unknown as Request;
    
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as unknown as Response;
    
    const mockNext = vi.fn();
    
    await queueOllamaRequest(mockReq, mockRes, mockNext);
    
    // Wait for the queue task to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Next should be called after the queue task completes
    expect(mockNext).toHaveBeenCalled();
  });
});
