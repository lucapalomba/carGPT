import * as z from 'zod';


/**
 * Ollama structured output schemas based on https://ollama.com/blog/structured-outputs
 */

/**
 * Utility functions for validating structured outputs with Zod schemas
 */

/**
 * Validates and parses structured output from LLM responses
 */
export class StructuredOutputValidator {
  /**
   * Converts a Zod schema to a JSON schema for Ollama
   */
  static convertSchema(schema: any): object {
    try {
      // Use Zod's built-in JSON schema conversion for all schemas
      const jsonSchema = z.toJSONSchema(schema) as any;
      
      // Ensure that schema has proper structure for Ollama
      if (jsonSchema && typeof jsonSchema === 'object' && !jsonSchema.type) {
        jsonSchema.type = 'object';
      }
      
      // Remove circular references and problematic properties
      return this.cleanSchema(jsonSchema);
    } catch (error) {
      console.error('Schema conversion error:', error);
      throw new Error(`Failed to convert schema: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
    }
  }
  
  /**
   * Clean schema to remove problematic properties that Ollama doesn't support
   */
  private static cleanSchema(schema: any): any {
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }
    
    if (Array.isArray(schema)) {
      return schema.map(item => this.cleanSchema(item));
    }
    
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(schema)) {
      // Skip problematic properties
      if (key === '$schema' || key === 'additionalProperties' && value === false) {
        continue;
      }
      
      cleaned[key] = this.cleanSchema(value);
    }
    
    return cleaned;
  }

}

/**
 * Common schema descriptions for prompts
 */


/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS = {
  enableStrictMode: false,
  logValidationErrors: true,
  maxRetries: 3,
  fallbackToText: true
};