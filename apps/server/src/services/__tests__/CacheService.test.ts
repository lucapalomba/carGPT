import { CacheService } from '../CacheService';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get a value', () => {
    cacheService.set('key', 'value');
    const value = cacheService.get('key');
    expect(value).toBe('value');
  });

  it('should return null for a non-existent key', () => {
    const value = cacheService.get('non-existent');
    expect(value).toBeNull();
  });

  it('should return null for an expired key', () => {
    cacheService.set('key', 'value', 1000);
    vi.advanceTimersByTime(2000);
    const value = cacheService.get('key');
    expect(value).toBeNull();
  });

  it('should not return an expired key', () => {
    cacheService.set('key', 'value', 5000);
    vi.advanceTimersByTime(4999);
    expect(cacheService.get('key')).toBe('value');
    vi.advanceTimersByTime(2);
    expect(cacheService.get('key')).toBeNull();
  });

  it('should clear the cache', () => {
    cacheService.set('key1', 'value1');
    cacheService.set('key2', 'value2');
    cacheService.clear();
    expect(cacheService.get('key1')).toBeNull();
    expect(cacheService.get('key2')).toBeNull();
  });

  it('should generate a consistent key', () => {
    const key1 = cacheService.generateKey('prefix', 'arg1', 'arg2');
    const key2 = cacheService.generateKey('prefix', 'arg1', 'arg2');
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different args', () => {
    const key1 = cacheService.generateKey('prefix', 'arg1', 'arg2');
    const key2 = cacheService.generateKey('prefix', 'arg1', 'arg3');
    expect(key1).not.toBe(key2);
  });

  it('should normalize string arguments in key generation', () => {
    const key1 = cacheService.generateKey('prefix', '  ARG1  ', 'arg2');
    const key2 = cacheService.generateKey('prefix', 'arg1', 'arg2');
    expect(key1).toBe(key2);
  });

  it('should handle numeric arguments in key generation', () => {
    const key1 = cacheService.generateKey('prefix', 123, 'arg2');
    const key2 = cacheService.generateKey('prefix', 123, 'arg2');
    expect(key1).toBe(key2);
  });

  it('should get cache stats', () => {
    cacheService.set('key1', 'value1');
    cacheService.set('key2', 'value2');
    const stats = cacheService.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toEqual(['key1', 'key2']);
  });

  it('should return empty stats for an empty cache', () => {
    const stats = cacheService.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.keys).toEqual([]);
  });
});
