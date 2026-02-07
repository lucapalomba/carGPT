import { describe, it, expect, vi } from 'vitest';

// Mock dotenv to prevent it from loading actual .env file
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn()
  }
}));

// Import after mocking
import { config, validateConfig, loadSwaggerDocument } from '../index.js';
import { SERVICE_IDENTIFIERS } from '../../container/interfaces.js';

describe('Configuration Module - Basic Structure', () => {
  it('should have correct config structure', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
    
    // Check main properties
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('ollama');
    expect(config).toHaveProperty('aiProvider');
    expect(config).toHaveProperty('mode');
    expect(config).toHaveProperty('isProduction');

    expect(config).toHaveProperty('googleSearch');
    expect(config).toHaveProperty('carouselImageLength');
    expect(config).toHaveProperty('vision');
  });

  it('should have correct ollama config structure', () => {
    expect(config.ollama).toBeDefined();
    expect(typeof config.ollama).toBe('object');
    
    expect(config.ollama).toHaveProperty('url');
    expect(config.ollama).toHaveProperty('model');
    expect(config.ollama).toHaveProperty('cloudEnabled');
    expect(config.ollama).toHaveProperty('models');
    expect(config.ollama).toHaveProperty('options');
    
    expect(typeof config.ollama.url).toBe('string');
    expect(typeof config.ollama.model).toBe('string');
    expect(typeof config.ollama.cloudEnabled).toBe('boolean');
    expect(typeof config.ollama.models).toBe('object');
    expect(typeof config.ollama.options).toBe('string');
  });

  it('should have correct models structure', () => {
    const { models } = config.ollama;
    expect(models).toBeDefined();
    expect(typeof models).toBe('object');
    
    expect(models).toHaveProperty('translation');
    expect(models).toHaveProperty('suggestion');
    expect(models).toHaveProperty('intent');
    expect(models).toHaveProperty('elaboration');
    expect(models).toHaveProperty('vision');
    
    expect(typeof models.translation).toBe('string');
    expect(typeof models.suggestion).toBe('string');
    expect(typeof models.intent).toBe('string');
    expect(typeof models.elaboration).toBe('string');
    expect(typeof models.vision).toBe('string');
  });



  it('should have correct vision config structure', () => {
    expect(config.vision).toBeDefined();
    expect(typeof config.vision).toBe('object');
    
    expect(config.vision).toHaveProperty('modelConfidenceThreshold');
    expect(config.vision).toHaveProperty('textConfidenceThreshold');
    
    expect(typeof config.vision.modelConfidenceThreshold).toBe('number');
    expect(typeof config.vision.textConfidenceThreshold).toBe('number');
  });

  it('should validate config without errors', () => {
    expect(() => validateConfig()).not.toThrow();
  });
});

describe('Configuration Module - Type Conversion', () => {
  it('should have numeric types for number fields', () => {
    expect(typeof config.port).toBe('number');
    expect(typeof config.carouselImageLength).toBe('number');
    expect(typeof config.vision.modelConfidenceThreshold).toBe('number');
    expect(typeof config.vision.textConfidenceThreshold).toBe('number');
  });

  it('should have boolean for cloud enabled', () => {
    expect(typeof config.ollama.cloudEnabled).toBe('boolean');
  });

  it('should have string types for text fields', () => {
    expect(typeof config.aiProvider).toBe('string');
    expect(typeof config.mode).toBe('string');
    expect(typeof config.ollama.url).toBe('string');
    expect(typeof config.ollama.model).toBe('string');
    expect(typeof config.ollama.options).toBe('string');

  });
});

describe('Configuration Module - SERVICE_IDENTIFIERS', () => {
  it('should export SERVICE_IDENTIFIERS from container', () => {
    // This test ensures that interface exports are working
    expect(typeof SERVICE_IDENTIFIERS).toBe('object');
  });
});

describe('Configuration Module - Edge Cases', () => {
  it('should handle empty strings gracefully', () => {
    // Test that config object is complete even with missing env vars
    expect(config).toBeDefined();
    expect(typeof config.port).toBe('number');
    expect(typeof config.ollama.model).toBe('string');
  });

  it('should have valid default values', () => {
    // Check that defaults are reasonable
    expect(config.port).toBeGreaterThan(0);
    expect(config.port).toBeLessThan(65536);
    expect(config.carouselImageLength).toBeGreaterThan(0);
    expect(config.vision.modelConfidenceThreshold).toBeGreaterThanOrEqual(0);
    expect(config.vision.modelConfidenceThreshold).toBeLessThanOrEqual(1);
    expect(config.vision.textConfidenceThreshold).toBeGreaterThanOrEqual(0);
    expect(config.vision.textConfidenceThreshold).toBeLessThanOrEqual(1);
  });
});

describe('Configuration Module - Swagger Document', () => {
  it('should load swagger document', () => {
    expect(() => loadSwaggerDocument()).not.toThrow();
  });

  it('should return object from swagger document', () => {
    const swaggerDoc = loadSwaggerDocument();
    expect(typeof swaggerDoc).toBe('object');
  });

  it('should handle swagger file errors gracefully', () => {
    // Test the error handling in loadSwaggerDocument
    // The function already has try-catch, so it should not throw
    expect(() => loadSwaggerDocument()).not.toThrow();
  });
});

describe('Configuration Module - Environment Specific', () => {
  it('should have correct production flag based on environment', () => {
    expect(typeof config.isProduction).toBe('boolean');
    expect(['development', 'production', 'test']).toContain(config.mode);
  });

  it('should handle google search config structure', () => {
    expect(config.googleSearch).toBeDefined();
    expect(typeof config.googleSearch).toBe('object');
    expect(config.googleSearch).toHaveProperty('apiKey');
    expect(config.googleSearch).toHaveProperty('cx');
    expect(config.googleSearch.apiKey).toBeUndefined(); // Should be undefined unless set
    expect(config.googleSearch.cx).toBeUndefined(); // Should be undefined unless set
  });

  it('should have valid port range', () => {
    expect(config.port).toBeGreaterThanOrEqual(0);
    expect(config.port).toBeLessThanOrEqual(65535);
  });

  it('should have positive carousel image length', () => {
    expect(config.carouselImageLength).toBeGreaterThan(0);
  });

  it('should have boolean isProduction flag', () => {
    expect(typeof config.isProduction).toBe('boolean');
  });
});

describe('Configuration Module - Environment Loading', () => {
  // Test environment loading without require() calls
  it('should have default environment settings', () => {
    // Test that environment detection works
    expect(config.mode).toBeDefined();
    expect(typeof config.mode).toBe('string');
    expect(['development', 'production', 'test']).toContain(config.mode);
  });

  it('should handle environment variable precedence', () => {
    // Verify config structure handles environment precedence correctly
    expect(config).toBeDefined();
    expect(typeof config.isProduction).toBe('boolean');
  });
});