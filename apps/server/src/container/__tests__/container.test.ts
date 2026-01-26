import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container, registerDependencies } from '../index.js';
import { SERVICE_IDENTIFIERS } from '../interfaces.js';

describe('DI Container', () => {
  beforeEach(() => {
    // Note: registerDependencies might have already been called or might be called by other tests
    // But we want to test if it works and binds everything correctly
    registerDependencies();
  });

  it('should have all core services registered', () => {
    expect(container.isBound(SERVICE_IDENTIFIERS.CACHE_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.OLLAMA_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.PROMPT_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.IMAGE_SEARCH_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE)).toBe(true);
  });

  it('should have all AI sub-services registered', () => {
    expect(container.isBound(SERVICE_IDENTIFIERS.INTENT_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.SUGGESTION_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.ELABORATION_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.TRANSLATION_SERVICE)).toBe(true);
    expect(container.isBound(SERVICE_IDENTIFIERS.ENRICHMENT_SERVICE)).toBe(true);
  });

  it('should have the main AI Service registered', () => {
    expect(container.isBound(SERVICE_IDENTIFIERS.AI_SERVICE)).toBe(true);
  });

});
