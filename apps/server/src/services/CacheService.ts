import { ICacheService, SERVICE_IDENTIFIERS } from '../container/interfaces.js';
import { injectable, inject } from 'inversify';
import logger from '../utils/logger.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@injectable()
export class CacheService implements ICacheService {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
    logger.info('ai.cache.cleared', { category: 'performance' });
  }
  
  generateKey(prefix: string, ...args: (string | number)[]): string {
    const normalizedArgs = args.map(arg => 
      typeof arg === 'string' ? arg.toLowerCase().trim() : arg
    ).join('|');
    return `${prefix}:${normalizedArgs}`;
  }
  
  // Additional methods for monitoring
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}