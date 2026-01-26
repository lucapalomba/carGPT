import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../CacheService.js';
import logger from '../../utils/logger.js';

vi.mock('../../utils/logger.js');

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should store and retrieve data', () => {
    cacheService.set('test-key', { foo: 'bar' });
    expect(cacheService.get('test-key')).toEqual({ foo: 'bar' });
  });

  it('should return null for non-existent key', () => {
    expect(cacheService.get('non-existent')).toBeNull();
  });

  it('should respect TTL', () => {
    cacheService.set('short-lived', 'data', 100); // 100ms TTL
    expect(cacheService.get('short-lived')).toBe('data');

    // Fast-forward time
    vi.advanceTimersByTime(101);
    expect(cacheService.get('short-lived')).toBeNull();
  });

  it('should use default TTL if not provided', () => {
    cacheService.set('default-ttl', 'data');
    
    // Default is 5 minutes (300,000 ms)
    vi.advanceTimersByTime(299999);
    expect(cacheService.get('default-ttl')).toBe('data');

    vi.advanceTimersByTime(2);
    expect(cacheService.get('default-ttl')).toBeNull();
  });

  it('should clear the cache', () => {
    cacheService.set('key1', 'val1');
    cacheService.set('key2', 'val2');
    
    cacheService.clear();
    
    expect(cacheService.get('key1')).toBeNull();
    expect(cacheService.get('key2')).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('ai.cache.cleared', { category: 'performance' });
  });

  it('should generate keys with prefix and args', () => {
    const key = cacheService.generateKey('search', 'BMW', 'M3', 2024);
    expect(key).toBe('search:bmw|m3|2024');
  });

  it('should normalize string arguments in generateKey', () => {
    const key = cacheService.generateKey('test', '  Mixed CASE  ', ' Space ');
    expect(key).toBe('test:mixed case|space');
  });

  it('should return cache stats', () => {
    cacheService.set('k1', 'v1');
    cacheService.set('k2', 'v2');
    
    const stats = cacheService.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('k1');
    expect(stats.keys).toContain('k2');
  });
});
