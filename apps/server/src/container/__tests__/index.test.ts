import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'inversify';
import { SERVICE_IDENTIFIERS } from '../interfaces.js';

describe('Container Configuration', () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();
    vi.clearAllMocks();
  });

  describe('Container Initialization', () => {
    it('should create a container instance', () => {
      expect(testContainer).toBeDefined();
      expect(typeof testContainer.bind).toBe('function');
      expect(typeof testContainer.get).toBe('function');
      expect(typeof testContainer.unbindAll).toBe('function');
    });

    it('should export SERVICE_IDENTIFIERS', () => {
      expect(SERVICE_IDENTIFIERS).toBeDefined();
      expect(typeof SERVICE_IDENTIFIERS).toBe('object');
    });

    it('should have all required service identifiers', () => {
      const requiredIdentifiers = [
        'CACHE_SERVICE',
        'OLLAMA_SERVICE',
        'PROMPT_SERVICE',
        'AI_SERVICE',
        'IMAGE_SEARCH_SERVICE',
        'INTENT_SERVICE',
        'SUGGESTION_SERVICE',
        'ELABORATION_SERVICE',
        'TRANSLATION_SERVICE',
        'ENRICHMENT_SERVICE',
        'CONVERSATION_SERVICE',
        'JUDGE_SERVICE'
      ];

      requiredIdentifiers.forEach(identifier => {
        const serviceIdentifier = SERVICE_IDENTIFIERS[identifier as keyof typeof SERVICE_IDENTIFIERS];
        expect(serviceIdentifier).toBeDefined();
        expect(typeof serviceIdentifier).toBe('symbol');
      });
    });
  });

  describe('Service Registration', () => {
    it('should register services without errors', () => {
      class MockService {}
      
      expect(() => {
        testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
        testContainer.bind(SERVICE_IDENTIFIERS.OLLAMA_SERVICE).to(MockService).inSingletonScope();
        testContainer.bind(SERVICE_IDENTIFIERS.PROMPT_SERVICE).to(MockService).inSingletonScope();
      }).not.toThrow();
    });

    it('should register services as singletons', () => {
      class MockService {}
      
      testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.CACHE_SERVICE)).toBe(true);
      
      // Test singleton scope
      const instance1 = testContainer.get(SERVICE_IDENTIFIERS.CACHE_SERVICE);
      const instance2 = testContainer.get(SERVICE_IDENTIFIERS.CACHE_SERVICE);
      expect(instance1).toBe(instance2);
    });

    it('should register multiple services', () => {
      class MockService {}
      const services = [
        SERVICE_IDENTIFIERS.CACHE_SERVICE,
        SERVICE_IDENTIFIERS.OLLAMA_SERVICE,
        SERVICE_IDENTIFIERS.PROMPT_SERVICE,
        SERVICE_IDENTIFIERS.AI_SERVICE
      ];

      services.forEach(service => {
        testContainer.bind(service).to(MockService).inSingletonScope();
      });

      services.forEach(service => {
        expect(testContainer.isBound(service)).toBe(true);
      });
    });

    it('should register exactly 4 services', () => {
      class MockService {}
      const services = [
        SERVICE_IDENTIFIERS.CACHE_SERVICE,
        SERVICE_IDENTIFIERS.OLLAMA_SERVICE,
        SERVICE_IDENTIFIERS.PROMPT_SERVICE,
        SERVICE_IDENTIFIERS.AI_SERVICE
      ];

      services.forEach(service => {
        testContainer.bind(service).to(MockService).inSingletonScope();
      });

      const boundCount = services.filter(id => testContainer.isBound(id)).length;
      expect(boundCount).toBe(4);
    });
  });

  describe('Service Resolution', () => {
    beforeEach(() => {
      class MockService {
        test = 'mock';
      }
      
      testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      testContainer.bind(SERVICE_IDENTIFIERS.OLLAMA_SERVICE).to(MockService).inSingletonScope();
      testContainer.bind(SERVICE_IDENTIFIERS.PROMPT_SERVICE).to(MockService).inSingletonScope();
    });

    it('should resolve registered services', () => {
      const services = [
        SERVICE_IDENTIFIERS.CACHE_SERVICE,
        SERVICE_IDENTIFIERS.OLLAMA_SERVICE,
        SERVICE_IDENTIFIERS.PROMPT_SERVICE
      ];

      services.forEach(serviceIdentifier => {
        expect(() => testContainer.get(serviceIdentifier)).not.toThrow();
        const service = testContainer.get(serviceIdentifier);
        expect(service).toBeDefined();
        expect(typeof service).toBe('object');
      });
    });

    it('should throw error when resolving unregistered service', () => {
      const fakeIdentifier = Symbol('FAKE_SERVICE');
      
      expect(() => testContainer.get(fakeIdentifier)).toThrow();
    });

    it('should return same instance for singleton services', () => {
      const services = [
        SERVICE_IDENTIFIERS.CACHE_SERVICE,
        SERVICE_IDENTIFIERS.OLLAMA_SERVICE,
        SERVICE_IDENTIFIERS.PROMPT_SERVICE
      ];

      services.forEach(serviceIdentifier => {
        const instance1 = testContainer.get(serviceIdentifier);
        const instance2 = testContainer.get(serviceIdentifier);
        expect(instance1).toBe(instance2);
      });
    });
  });

  describe('Container Management', () => {
    it('should clear all bindings when unbindAll is called', () => {
      const mockService = vi.fn();
      
      testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(mockService).inSingletonScope();
      testContainer.bind(SERVICE_IDENTIFIERS.OLLAMA_SERVICE).to(mockService).inSingletonScope();
      
      // Verify services are bound
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.CACHE_SERVICE)).toBe(true);
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.OLLAMA_SERVICE)).toBe(true);
      
      // Clear all bindings
      testContainer.unbindAll();
      
      // Verify services are no longer bound
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.CACHE_SERVICE)).toBe(false);
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.OLLAMA_SERVICE)).toBe(false);
    });

    it('should allow re-registration after clearing', () => {
      class MockService {}
      
      testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      testContainer.unbindAll();
      
      expect(() => {
        testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      }).not.toThrow();
      
      expect(testContainer.isBound(SERVICE_IDENTIFIERS.CACHE_SERVICE)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate registrations gracefully', () => {
      class MockService {}
      
      testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      
      // Attempting to bind again should not throw in modern Inversify versions
      // It rebinds instead
      expect(() => {
        testContainer.bind(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(MockService).inSingletonScope();
      }).not.toThrow();
    });

    it('should provide meaningful error messages for missing dependencies', () => {
      const fakeIdentifier = Symbol('MISSING_SERVICE');
      
      try {
        testContainer.get(fakeIdentifier);
      } catch (error) {
        expect((error as Error).message).toContain('No bindings found');
      }
    });
  });
});