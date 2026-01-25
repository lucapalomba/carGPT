import { 
  SERVICE_IDENTIFIERS, 
  IOllamaService, 
  ICacheService,
  IIntentService,
  ISuggestionService,
  IElaborationService,
  ITranslationService,
  IEnrichmentService,
  IAIService
} from '../container/interfaces.js';
import { Car, SearchResponse } from './ai/types.js';
import { injectable, inject } from 'inversify';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';

// Export Shared Types for consumers
export type { Car, SearchResponse };

// DI-enabled AIService implementation
@injectable()
export class AIService implements IAIService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.CACHE_SERVICE) private cache: ICacheService,
    @inject(SERVICE_IDENTIFIERS.INTENT_SERVICE) private intentService: IIntentService,
    @inject(SERVICE_IDENTIFIERS.SUGGESTION_SERVICE) private suggestionService: ISuggestionService,
    @inject(SERVICE_IDENTIFIERS.ELABORATION_SERVICE) private elaborationService: IElaborationService,
    @inject(SERVICE_IDENTIFIERS.TRANSLATION_SERVICE) private translationService: ITranslationService,
    @inject(SERVICE_IDENTIFIERS.ENRICHMENT_SERVICE) private enrichmentService: IEnrichmentService
  ) {}
  
  async findCarsWithImages(requirements: string, language: string, sessionId: string): Promise<SearchResponse> {
    const isAvailable = await this.ollamaService.verifyOllama();
    if (!isAvailable) {
      throw new Error('AI service not available');
    }

    const trace = langfuse.trace({
      name: "search_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: requirements,
    });
    
    try {
      const searchIntent = await this.intentService.determineSearchIntent(requirements, language, trace);
      const suggestions = await this.suggestionService.getCarSuggestions(searchIntent, requirements, '', trace);
      const elaboratedCars = await this.elaborationService.elaborateCars(suggestions.choices, searchIntent, trace);
      const translatedResults = await this.translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await this.enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({ output: result });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
  
  async refineCarsWithImages(feedback: string, language: string, sessionId: string, fullContext: string, pinnedCars: Car[] = []): Promise<SearchResponse> {
    const trace = langfuse.trace({
      name: "refine_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: feedback,
    });
    
    try {
      const searchIntent = await this.intentService.determineSearchIntent(feedback, language, trace);
      
      // Incorporate pinned cars into the context
      const pinnedCarsPrompt = pinnedCars.length > 0 
        ? `The user has pinned the following cars: ${pinnedCars.map(c => `${c.make} ${c.model} (${c.year})`).join(', ')}. Keep these in mind while refining the search.`
        : '';
      
      const combinedContext = [fullContext, pinnedCarsPrompt].filter(Boolean).join('\n\n');
      
      const suggestions = await this.suggestionService.getCarSuggestions(searchIntent, feedback, combinedContext, trace);
      
      // Combine pinned cars with new suggestions for elaboration
      const combinedCars = [
        ...pinnedCars.map(c => ({ ...c, pinned: true })),
        ...suggestions.choices
      ];
      
      const elaboratedCars = await this.elaborationService.elaborateCars(combinedCars, searchIntent, trace);
      const translatedResults = await this.translationService.translateResults(
        { analysis: suggestions.analysis, cars: elaboratedCars }, 
        language, 
        trace
      );
      const enrichedCars = await this.enrichmentService.enrichCarsWithImages(translatedResults.cars, trace);

      const result = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars
      };

      trace.update({ output: result });

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