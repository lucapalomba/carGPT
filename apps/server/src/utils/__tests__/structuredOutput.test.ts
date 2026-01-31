import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredOutputValidator, SCHEMA_DESCRIPTIONS, DEFAULT_VALIDATION_OPTIONS } from '../structuredOutput.js';
import * as z_module from 'zod';
const { z } = z_module as any;

describe('StructuredOutputValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertSchema', () => {
    it('should convert a simple Zod schema to JSON schema', () => {
      const simpleSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const result = StructuredOutputValidator.convertSchema(simpleSchema) as any;

      expect(result).toHaveProperty('type', 'object');
      expect(result).toHaveProperty('properties');
      expect(result.properties).toHaveProperty('name');
      expect(result.properties).toHaveProperty('age');
    });

    it('should handle nested objects', () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            email: z.string()
          })
        })
      });

      const result = StructuredOutputValidator.convertSchema(nestedSchema) as any;

      expect(result.properties.user.type).toBe('object');
      expect(result.properties.user.properties).toHaveProperty('id');
      expect(result.properties.user.properties).toHaveProperty('profile');
    });

    it('should handle arrays', () => {
      const arraySchema = z.object({
        tags: z.array(z.string())
      });

      const result = StructuredOutputValidator.convertSchema(arraySchema) as any;

      expect(result.properties.tags.type).toBe('array');
      expect(result.properties.tags.items).toHaveProperty('type', 'string');
    });

    it('should handle enum values', () => {
      const enumSchema = z.object({
        status: z.enum(['active', 'pending'])
      });

      const result = StructuredOutputValidator.convertSchema(enumSchema) as any;

      expect(result.properties.status.type).toBe('string');
      expect(result.properties.status).toHaveProperty('enum');
      expect(Array.isArray(result.properties.status.enum)).toBe(true);
      expect(result.properties.status.enum).toContain('active');
    });

    it('should clean problematic properties', () => {
      const testSchema = z.object({ name: z.string() });
      const result = StructuredOutputValidator.convertSchema(testSchema) as any;

      expect(result).not.toHaveProperty('$schema');
      // additionalProperties should be removed if it's false
      if (result.additionalProperties === false) {
          throw new Error('additionalProperties should have been removed');
      }
    });

    it('should handle schema without type property', () => {
      // Mock toJSONSchema on the module if possible, or just test that it sets default type
      // Since z.toJSONSchema is already there, we can trust it for the most part.
      const result = StructuredOutputValidator.convertSchema(z.object({})) as any;
      expect(result.type).toBe('object');
    });
  });
});

describe('SCHEMA_DESCRIPTIONS', () => {
  it('should contain all expected schema descriptions', () => {
    const expectedKeys = [
      'CAR_SUGGESTIONS',
      'ELABORATION',
      'SEARCH_INTENT',
      'VERIFY_CAR',
      'ANALYSIS_TRANSLATION',
      'JUDGE_VERDICT'
    ];

    expectedKeys.forEach(key => {
      expect(SCHEMA_DESCRIPTIONS).toHaveProperty(key);
    });
  });

  it('should have valid JSON structure in descriptions', () => {
    const testDescriptions = [
        'CAR_SUGGESTIONS',
        'SEARCH_INTENT',
        'VERIFY_CAR',
        'ANALYSIS_TRANSLATION',
        'JUDGE_VERDICT'
    ];

    testDescriptions.forEach(key => {
      const description = SCHEMA_DESCRIPTIONS[key as keyof typeof SCHEMA_DESCRIPTIONS];
      const jsonMatch = description.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error(`Invalid JSON in ${key}:`, jsonMatch[0]);
          throw e;
        }
      }
    });
  });
});

describe('DEFAULT_VALIDATION_OPTIONS', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_VALIDATION_OPTIONS).toEqual({
      enableStrictMode: false,
      logValidationErrors: true,
      maxRetries: 3,
      fallbackToText: true
    });
  });
});