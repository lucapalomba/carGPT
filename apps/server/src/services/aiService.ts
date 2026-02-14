import {
  SERVICE_IDENTIFIERS,
  IOllamaService,
  ICacheService,
  IIntentService,
  ISuggestionService,
  IElaborationService,
  ITranslationService,
  IEnrichmentService,
  IAIService,
  IJudgeService
} from '../container/interfaces.js';
import { Car, SearchResponse } from './ai/types.js';
import { injectable, inject } from 'inversify';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

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
    @inject(SERVICE_IDENTIFIERS.ENRICHMENT_SERVICE) private enrichmentService: IEnrichmentService,
    @inject(SERVICE_IDENTIFIERS.JUDGE_SERVICE) private judgeService: IJudgeService
  ) { }

  async findCarsWithImages(requirements: string, language: string, sessionId: string): Promise<SearchResponse> {
    // Temporarily remove availability check to test the flow
    logger.debug('AI Service: Starting findCarsWithImages...');

    const trace = langfuse.trace({
      name: "search_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: requirements,
    });

    try {
      const searchIntent = await this.withRetry('determineSearchIntent', () =>
        this.intentService.determineSearchIntent(requirements, language, trace)
      );
      const suggestions = await this.withRetry('getCarSuggestions', () =>
        this.suggestionService.getCarSuggestions(searchIntent, requirements, '', trace)
      );
      const elaboratedCars = await this.withRetry('elaborateCars', () =>
        this.elaborationService.elaborateCars(suggestions.choices, searchIntent, trace)
      );

      const translatedResults = await this.withRetry('translateResults', () =>
        this.translationService.translateResults(
          { analysis: suggestions.analysis, cars: elaboratedCars },
          language,
          trace
        )
      );
      const enrichedCars = await this.withRetry('enrichCarsWithImages', () =>
        this.enrichmentService.enrichCarsWithImages(translatedResults.cars, trace)
      );

      const result: SearchResponse = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars,
        searchIntent: searchIntent,
        suggestions: suggestions
      };

      // Execute Judge Evaluation on the complete result
      let judgeResult = null;
      try {
        judgeResult = await this.judgeService.evaluateResponse(
          requirements,
          result,
          language,
          trace
        );
      } catch (judgeError) {
        console.warn('Judge evaluation failed silently:', judgeError);
      }

      trace.update({
        output: result,
        metadata: {
          model: config.ollama.model,
          environment: config.mode,
          ...(judgeResult ? {
            judgeVerdict: judgeResult.verdict,
            judgeScore: judgeResult.vote
          } : {})
        },
        tags: judgeResult ? [judgeResult.vote >= 70 ? 'JUDGE_PASSED' : 'JUDGE_FAILED'] : []
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
    const trace = langfuse.trace({
      name: "refine_cars_API",
      sessionId: sessionId,
      metadata: { model: config.ollama.model, environment: config.mode },
      input: feedback,
    });

    try {
      // Structure the context to anchor refinement on the initial consideration
      const refinementContext = `
# REFINEMENT CONTEXT
${fullContext}

# LATEST FEEDBACK
${feedback}
`.trim();

      const searchIntent = await this.withRetry('determineSearchIntent', () =>
        this.intentService.determineSearchIntent(refinementContext, language, trace)
      );

      // Incorporate pinned cars into the context
      const pinnedCarsPrompt = pinnedCars.length > 0
        ? `The user has pinned the following cars: ${pinnedCars.map(c => `${c.make} ${c.model} (${c.year})`).join(', ')}. Keep these in mind while refining the search.`
        : '';

      const suggestions = await this.withRetry('getCarSuggestions', () =>
        this.suggestionService.getCarSuggestions(searchIntent, refinementContext, pinnedCarsPrompt, trace)
      );

      // Combine pinned cars with new suggestions for elaboration
      const combinedCars = [
        ...pinnedCars.map(c => ({ ...c, pinned: true })),
        ...suggestions.choices
      ];

      const elaboratedCars = await this.withRetry('elaborateCars', () =>
        this.elaborationService.elaborateCars(combinedCars, searchIntent, trace)
      );
      const translatedResults = await this.withRetry('translateResults', () =>
        this.translationService.translateResults(
          { analysis: suggestions.analysis, cars: elaboratedCars },
          language,
          trace
        )
      );
      const enrichedCars = await this.withRetry('enrichCarsWithImages', () =>
        this.enrichmentService.enrichCarsWithImages(translatedResults.cars, trace)
      );

      const result: SearchResponse = {
        success: true,
        analysis: translatedResults.analysis,
        cars: enrichedCars,
        searchIntent: searchIntent,
        suggestions: suggestions
      };

      // Execute Judge Evaluation on the complete result
      let judgeResult = null;
      try {
        // User requested that refinement evaluation includes initial request and all refinements
        // fullContext contains the conversation history
        const judgeContext = `Current Feedback: ${feedback}\n\nConversation History:\n${fullContext}`;

        judgeResult = await this.judgeService.evaluateResponse(
          judgeContext,
          result,
          language,
          trace
        );
      } catch (judgeError) {
        console.warn('Judge evaluation failed silently during refinement:', judgeError);
      }

      trace.update({
        output: result,
        metadata: {
          model: config.ollama.model,
          environment: config.mode,
          ...(judgeResult ? {
            judgeVerdict: judgeResult.verdict,
            judgeScore: judgeResult.vote
          } : {})
        },
        tags: judgeResult ? [judgeResult.vote >= 70 ? 'JUDGE_PASSED' : 'JUDGE_FAILED'] : []
      });

      return result;
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  private async withRetry<T>(taskName: string, operation: () => Promise<T>): Promise<T> {
    const maxRetries = config.aiRetryCount;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          logger.warn(`AI Service: Step "${taskName}" failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    logger.error(`AI Service: Step "${taskName}" failed after ${maxRetries + 1} attempts.`);
    throw lastError;
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