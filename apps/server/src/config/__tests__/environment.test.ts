import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  setupDevelopmentFeatures, 
  setupProductionFeatures, 
  configureLogging, 
  getSessionConfig, 
  getCorsConfig 
} from '../environment.js';

// Mock config
vi.mock('../index.js', () => ({
  config: {
    isProduction: false,
    session: {
      secret: 'test-secret',
      cookie: { maxAge: 3600000 }
    }
  }
}));

describe('environment', () => {
  const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('setupDevelopmentFeatures', () => {
    it('should log development features when not in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = false;
      
      setupDevelopmentFeatures();
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('Swagger docs available at /api-docs'));
    });

    it('should not log development features when in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      
      setupDevelopmentFeatures();
      
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  describe('setupProductionFeatures', () => {
    it('should log production features when in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      
      setupProductionFeatures();
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('Production mode detected:'));
    });

    it('should not log production features when not in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = false;
      
      setupProductionFeatures();
      
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  describe('configureLogging', () => {
    it('should return debug level for development', async () => {
      const { config } = await import('../index.js');
      config.isProduction = false;
      
      const result = configureLogging();
      expect(result).toEqual({ level: 'debug' });
    });

    it('should return info level for production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      
      const result = configureLogging();
      expect(result).toEqual({ level: 'info' });
    });
  });

  describe('getSessionConfig', () => {
    it('should return base config in development', async () => {
      const { config } = await import('../index.js');
      config.isProduction = false;
      
      const result = getSessionConfig();
      expect(result).toEqual(config.session);
    });

    it('should return secure config in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      
      const result = getSessionConfig() as any;
      expect(result.cookie.secure).toBe(true);
      expect(result.cookie.httpOnly).toBe(true);
    });
  });

  describe('getCorsConfig', () => {
    it('should return permissive config in development', async () => {
      const { config } = await import('../index.js');
      config.isProduction = false;
      
      const result = getCorsConfig();
      expect(result.origin).toBe(true);
    });

    it('should return secure config in production', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      
      const result = getCorsConfig();
      expect(result.origin).toEqual(['https://example.com']);
    });

    it('should use fallback origin in production when ALLOWED_ORIGINS is missing', async () => {
      const { config } = await import('../index.js');
      config.isProduction = true;
      const originalOrigins = process.env.ALLOWED_ORIGINS;
      delete process.env.ALLOWED_ORIGINS;
      
      const result = getCorsConfig();
      expect(result.origin).toEqual(['http://localhost:3000']);
      
      process.env.ALLOWED_ORIGINS = originalOrigins;
    });
  });
});