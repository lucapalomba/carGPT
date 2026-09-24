import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Prevent dotenv from reading the real .env so process.env is fully controlled.
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

// Mock fs so we can drive loadSwaggerDocument down its success and failure paths.
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

const flushConfigEnv = () => {
  const keys = [
    'APP_ENV',
    'NODE_ENV',
    'OLLAMA_CLOUD_ENABLED',
    'OLLAMA_CLOUD_API_KEY',
    'OLLAMA_CLOUD_URL',
    'OLLAMA_URL',
    'AI_RETRY_COUNT',
    'ALLOWED_ORIGINS',
  ];
  keys.forEach(key => delete process.env[key]);
};

describe('config/index.ts branches', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    flushConfigEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateConfig', () => {
    it('requires cloud api key and url when cloud is enabled', async () => {
      process.env.OLLAMA_CLOUD_ENABLED = 'true';
      const { validateConfig } = await import('../index.js');

      expect(() => validateConfig()).toThrow(/OLLAMA_CLOUD_API_KEY/);
      expect(() => validateConfig()).toThrow(/OLLAMA_CLOUD_URL/);
    });

    it('passes when cloud is enabled and fully configured', async () => {
      process.env.OLLAMA_CLOUD_ENABLED = 'true';
      process.env.OLLAMA_CLOUD_API_KEY = 'key';
      process.env.OLLAMA_CLOUD_URL = 'https://cloud.example.com';
      const { validateConfig } = await import('../index.js');

      expect(() => validateConfig()).not.toThrow();
    });

    it('rejects a negative retry count', async () => {
      process.env.AI_RETRY_COUNT = '-1';
      const { validateConfig } = await import('../index.js');

      expect(() => validateConfig()).toThrow(/AI_RETRY_COUNT/);
    });
  });

  describe('environment-specific loading', () => {
    it('marks production mode', async () => {
      process.env.APP_ENV = 'production';
      const { config } = await import('../index.js');

      expect(config.isProduction).toBe(true);
      expect(config.mode).toBe('production');
    });

    it('marks test mode', async () => {
      process.env.APP_ENV = 'test';
      const { config } = await import('../index.js');

      expect(config.mode).toBe('test');
      expect(config.isProduction).toBe(false);
    });

    it('defaults to development', async () => {
      process.env.APP_ENV = 'development';
      const { config } = await import('../index.js');

      expect(config.mode).toBe('development');
      expect(config.isProduction).toBe(false);
    });

    it('parses OLLAMA_OPTIONS and numeric overrides', async () => {
      process.env.OLLAMA_OPTIONS = '{"temperature": 0.5}';
      process.env.CAROUSEL_IMAGES_LENGTH = '7';
      const { config } = await import('../index.js');

      expect(config.ollama.options).toBe('{"temperature": 0.5}');
      expect(config.carouselImageLength).toBe(7);
    });
  });

  describe('loadSwaggerDocument', () => {
    it('parses a valid swagger document', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ openapi: '3.0.0' }));

      const { loadSwaggerDocument } = await import('../index.js');
      expect(loadSwaggerDocument()).toEqual({ openapi: '3.0.0' });
    });

    it('returns an empty object and warns when reading fails', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { loadSwaggerDocument } = await import('../index.js');
      expect(loadSwaggerDocument()).toEqual({});
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
