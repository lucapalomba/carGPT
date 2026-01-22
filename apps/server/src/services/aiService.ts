import { SERVICE_IDENTIFIERS, IOllamaService, ICacheService } from '../container/interfaces.js';
import { Car, SearchResponse } from './ai/types.js';
import { injectable, inject } from 'inversify';
import { intentService } from './ai/intentService.js';
import { suggestionService } from './ai/suggestionService.js';
import { elaborationService } from './ai/elaborationService.js';
import { translationService } from './ai/translationService.js';
import { enrichmentService } from './ai/enrichmentService.js';
import { ollamaService } from './ollamaService.js';
import { createTrace } from '../utils/langfuse.js';

// Export Shared Types for consumers
export type { Car, SearchResponse };

// DI-enabled AIService implementation
@injectable()
export class AIService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.CACHE_SERVICE) private cache: ICacheService
  ) {}
  
  async findCarsWithImages(requirements: string, language: string, sessionId: string): Promise<SearchResponse> {
    const isAvailable = await this.ollamaService.verifyOllama();
    if (!isAvailable) {
      throw new Error('AI service not available');
    }

    const trace = createTrace("findCarsWithImages", { requirements, language, sessionId });
    
    try {
      const searchIntent = await intentService.determineSearchIntent(requirements, language, trace);
      const suggestions = await suggestionService.getCarSuggestions(searchIntent, requirements, '', trace);
      const elaboratedCars = await elaborationService.elaborateCars(suggestions.choices, searchIntent, trace);
      const translatedResults = await translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({
        output: result
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
  
  async refineCarsWithImages(feedback: string, language: string, sessionId: string, fullContext: string, pinnedCars: Car[] = []): Promise<SearchResponse> {
    const trace = createTrace("refineCarsWithImages", { feedback, language, sessionId, fullContext, pinnedCars });
    
    try {
      const searchIntent = await intentService.determineSearchIntent(feedback, language, trace);
      const suggestions = await suggestionService.getCarSuggestions(searchIntent, feedback, fullContext, trace);
      const elaboratedCars = await elaborationService.elaborateCars(suggestions.choices, searchIntent, trace);
      const translatedResults = await translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({
        output: result
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
  
  async verify(): Promise<boolean> {
    return await this.ollamaService.verifyOllama();
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getCacheStats();
  }
}

// Legacy export for backward compatibility - now uses the full implementation
export const aiService = {
  findCarsWithImages: async (requirements: string, language: string, sessionId: string) => {
    const trace = createTrace("findCarsWithImages", { requirements, language, sessionId });
    
    try {
      const searchIntent = await intentService.determineSearchIntent(requirements, language, trace);
      const suggestions = await suggestionService.getCarSuggestions(searchIntent, requirements, '', trace);
      const elaboratedCars = await elaborationService.elaborateCars(suggestions.choices, searchIntent, trace);
      const translatedResults = await translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({
        output: result
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  },
  refineCarsWithImages: async (feedback: string, language: string, sessionId: string, fullContext: string, pinnedCars: Car[] = []) => {
    const trace = createTrace("refineCarsWithImages", { feedback, language, sessionId, fullContext, pinnedCars });
    
    try {
      const searchIntent = await intentService.determineSearchIntent(feedback, language, trace);
      const suggestions = await suggestionService.getCarSuggestions(searchIntent, feedback, fullContext, trace);
      const elaboratedCars = await elaborationService.elaborateCars(suggestions.choices, searchIntent, trace);
      const translatedResults = await translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({
        output: result
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  },
  verify: async () => await ollamaService.verifyOllama(),
  clearCache: () => {},
  getCacheStats: () => ({ size: 0, keys: [] })
};