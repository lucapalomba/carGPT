import { ollamaService } from './ollamaService.js';
import logger from '../utils/logger.js';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';
import { intentService } from './ai/intentService.js';
import { suggestionService } from './ai/suggestionService.js';
import { elaborationService } from './ai/elaborationService.js';
import { translationService } from './ai/translationService.js';
import { enrichmentService } from './ai/enrichmentService.js';
import { Car, SearchResponse } from './ai/types.js';

// Export Shared Types for consumers
export type { Car, SearchResponse };

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
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
  }
  
  // Generate cache key with normalization
  generateKey(prefix: string, ...args: (string | number)[]): string {
    const normalizedArgs = args.map(arg => 
      typeof arg === 'string' ? arg.toLowerCase().trim() : arg
    ).join('|');
    return `${prefix}:${normalizedArgs}`;
  }
}

const cache = new CacheService();

/**
 * AI service orchestrator that uses specialized sub-services for car recommendations
 */
export const aiService = {
  /**
   * Get car recommendations with images using Ollama
   * 
   * @param requirements - User requirements for car search
   * @param language - User's preferred language
   * @param sessionId - Session identifier
   * @returns Structured response with cars and images
   */
  async findCarsWithImages(
    requirements: string,
    language: string,
    sessionId: string
  ): Promise<SearchResponse> {
    const trace = langfuse.trace({
      name: "search_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: requirements,
    });

    try {
      logger.info('ai.search.start', { sessionId, requirements: requirements.substring(0, 50), category: 'ai' });
      
      // Check cache for search intent (cache for 10 minutes)
      const intentCacheKey = cache.generateKey('intent', requirements, language);
      let searchIntent = cache.get<any>(intentCacheKey);
      
      if (searchIntent) {
        logger.debug('ai.cache.hit', { type: 'intent', key: intentCacheKey, category: 'performance' });
      } else {
        searchIntent = await intentService.determineSearchIntent(requirements, language, trace);
        cache.set(intentCacheKey, searchIntent, 600000); // 10 minutes
        logger.debug('ai.cache.miss', { type: 'intent', key: intentCacheKey, category: 'performance' });
      }
      
      // Check cache for suggestions (cache for 5 minutes, depends on intent)
      const suggestionCacheKey = cache.generateKey('suggestions', JSON.stringify(searchIntent), requirements);
      let suggestions = cache.get<any>(suggestionCacheKey);
      
      if (suggestions) {
        logger.debug('ai.cache.hit', { type: 'suggestions', key: suggestionCacheKey, category: 'performance' });
      } else {
        suggestions = await suggestionService.getCarSuggestions(searchIntent, requirements, '', trace);
        cache.set(suggestionCacheKey, suggestions, 300000); // 5 minutes
        logger.debug('ai.cache.miss', { type: 'suggestions', key: suggestionCacheKey, category: 'performance' });
      }
      
      // Run remaining operations in parallel where possible
      const [elaboratedCars] = await Promise.all([
        elaborationService.elaborateCars(suggestions.choices || [], searchIntent, trace)
      ]);
      
      // Translation and enrichment can also run in parallel for better performance
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const [translatedResult, carsWithImages] = await Promise.all([
        translationService.translateResults(intermediateResult, language, trace),
        enrichmentService.enrichCarsWithImages(elaboratedCars, trace)
      ]);

      const result = { searchIntent, suggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      
      logger.info('ai.search.complete', { 
        sessionId, 
        carsCount: result.cars.length,
        cacheHits: ['intent', 'suggestions'].filter(type => cache.get(cache.generateKey(type, requirements, language) || cache.generateKey(type, JSON.stringify(searchIntent), requirements))).length,
        category: 'ai'
      });
      
      return result;
    } catch (error) {
      logger.error('ai.search.error', { error, sessionId, category: 'ai', errorCode: 'search_failed' });
      // Trace stays open as a placeholder for the error, but root trace doesn't support 'level' in update
      // We rely on the spans within the trace to show the error level
      throw error;
    }
  },

  /**
   * Refine existing car search with feedback
   */
  async refineCarsWithImages(
    feedback: string,
    language: string,
    sessionId: string,
    fullContext: string,
    pinnedCars: Car[] = []
  ): Promise<SearchResponse> {
    const trace = langfuse.trace({
      name: "refine_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: { feedback, pinnedCarsCount: pinnedCars.length },
    });

    try {
      logger.info('ai.refine.start', { sessionId, feedback: feedback.substring(0, 50), category: 'ai' });
      
      const context = `Conversation History:\n${fullContext}\n\nLatest Feedback: ${feedback}`;
      
      // Check cache for refined intent (shorter cache since feedback context changes frequently)
      const refineIntentCacheKey = cache.generateKey('refine_intent', context, language);
      let searchIntent = cache.get<any>(refineIntentCacheKey);
      
      if (searchIntent) {
        logger.debug('ai.cache.hit', { type: 'refine_intent', key: refineIntentCacheKey, category: 'performance' });
      } else {
        searchIntent = await intentService.determineSearchIntent(context, language, trace);
        cache.set(refineIntentCacheKey, searchIntent, 120000); // 2 minutes for refinement
        logger.debug('ai.cache.miss', { type: 'refine_intent', key: refineIntentCacheKey, category: 'performance' });
      }
      
      const pinnedCarsPrompt = pinnedCars.length > 0 
        ? `IMPORTANT: The user has previously pinned the following cars. You MUST include these EXACT cars in your "pinned_cars" array in the response.\n\n` +
          `For each of these cars, you must:\n` +
          `1. Re-evaluate his "percentage" based on the new intent.\n` +
          `2. Provide a new "selection_reasoning" explaining why it is still relevant.\n` +
          `3. Ensure "configuration" and "precise_model" are accurate.\n\n` +
          `Pinned Cars to include:\n${pinnedCars.map(c => `- ${c.make} ${c.model} (${c.year})`).join('\n')}`
        : '';

      // Check cache for refined suggestions (depends on intent and context)
      const refineSuggestionCacheKey = cache.generateKey('refine_suggestions', JSON.stringify(searchIntent), context, pinnedCars.length);
      let suggestions = cache.get<any>(refineSuggestionCacheKey);
      
      if (suggestions) {
        logger.debug('ai.cache.hit', { type: 'refine_suggestions', key: refineSuggestionCacheKey, category: 'performance' });
      } else {
        suggestions = await suggestionService.getCarSuggestions(searchIntent, context, pinnedCarsPrompt, trace);
        cache.set(refineSuggestionCacheKey, suggestions, 180000); // 3 minutes for refinement
        logger.debug('ai.cache.miss', { type: 'refine_suggestions', key: refineSuggestionCacheKey, category: 'performance' });
      }
      
      // Merge and deduplicate pinned + new suggestions
      const resultChoices = [...(suggestions.pinned_cars || []), ...(suggestions.choices || [])];

      const uniqueCarChoices = resultChoices
        .filter((car, index, self) => 
          index === self.findIndex((c) => 
            (c.make || '').toLowerCase() === (car.make || '').toLowerCase() && 
            (c.model || '').toLowerCase() === (car.model || '').toLowerCase()
          )
        );

      // Parallel execution for remaining operations
      const [elaboratedCars] = await Promise.all([
        elaborationService.elaborateCars(uniqueCarChoices, searchIntent, trace)
      ]);
      
      // Translation and enrichment in parallel
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const [translatedResult, carsWithImages] = await Promise.all([
        translationService.translateResults(intermediateResult, language, trace),
        enrichmentService.enrichCarsWithImages(elaboratedCars, trace)
      ]);

      const result = { searchIntent, suggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      
      logger.info('ai.refine.complete', { 
        sessionId, 
        carsCount: result.cars.length,
        pinnedCarsCount: pinnedCars.length,
        cacheHits: ['refine_intent', 'refine_suggestions'].filter(type => cache.get(cache.generateKey(type, context, language) || cache.generateKey(type, JSON.stringify(searchIntent), context, pinnedCars.length))).length,
        category: 'ai'
      });
      
      return result;
    } catch (error) {
      logger.error('ai.refine.error', { error, sessionId, category: 'ai', errorCode: 'refine_failed' });
      throw error;
    }
  },

  /**
   * Verify that AI provider (Ollama) is available
   */
  async verify(): Promise<boolean> {
    return await ollamaService.verifyOllama();
  },

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    cache.clear();
    logger.info('ai.cache.cleared', { category: 'performance' });
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: (cache as any).cache.size,
      keys: Array.from((cache as any).cache.keys())
    };
  }
};
