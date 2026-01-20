import { ollamaService } from './ollamaService.js';
import logger from '../utils/logger.js';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';
import { intentService } from './ai/intentService.js';
import { suggestionService } from './ai/suggestionService.js';
import { elaborationService } from './ai/elaborationService.js';
import { translationService } from './ai/translationService.js';
import { enrichmentService } from './ai/enrichmentService.js';
import { uiService } from './ai/uiService.js';
import { Car, SearchResponse } from './ai/types.js';

// Export Shared Types for consumers
export type { Car, SearchResponse };

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
      logger.info('Starting car search process', { sessionId, requirements: requirements.substring(0, 50) });
      
      const searchIntent = await intentService.determineSearchIntent(requirements, language, trace);
      
      // Parallelize suggestion generation and UI suggestions if possible, 
      // but UI suggestions depend on searchIntent
      const [suggestions, uiSuggestions] = await Promise.all([
        suggestionService.getCarSuggestions(searchIntent, requirements, '', trace),
        uiService.getUiSuggestions(searchIntent, trace)
      ]);

      const elaboratedCars = await elaborationService.elaborateCars(suggestions.choices || [], searchIntent, trace);
      
      // Construct intermediate result for translation
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const translatedResult = await translationService.translateResults(intermediateResult, language, trace);

      const carsWithImages = await enrichmentService.enrichCarsWithImages(translatedResult.cars, trace);

      const result = { searchIntent, suggestions, ui_suggestions: uiSuggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      return result;
    } catch (error) {
      logger.error('Error in findCarsWithImages', { error, sessionId });
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
      logger.info('Starting car refinement process', { sessionId, feedback: feedback.substring(0, 50) });
      
      const context = `Conversation History:\n${fullContext}\n\nLatest Feedback: ${feedback}`;
      const searchIntent = await intentService.determineSearchIntent(context, language, trace);
      
      const pinnedCarsPrompt = pinnedCars.length > 0 
        ? `IMPORTANT: The user has previously pinned the following cars. You MUST include these EXACT cars in your "pinned_cars" array in the response.\n\n` +
          `For each of these cars, you must:\n` +
          `1. Re-evaluate his "percentage" based on the new intent.\n` +
          `2. Provide a new "selection_reasoning" explaining why it is still relevant.\n` +
          `3. Ensure the "configuration" and "precise_model" are accurate.\n\n` +
          `Pinned Cars to include:\n${pinnedCars.map(c => `- ${c.make} ${c.model} (${c.year})`).join('\n')}`
        : '';

      const suggestions = await suggestionService.getCarSuggestions(searchIntent, context, pinnedCarsPrompt, trace);
      
      // Merge and deduplicate pinned + new suggestions
      const resultChoices = [...(suggestions.pinned_cars || []), ...(suggestions.choices || [])];

      const uniqueCarChoices = resultChoices
        .filter((car, index, self) => 
          index === self.findIndex((c) => 
            (c.make || '').toLowerCase() === (car.make || '').toLowerCase() && 
            (c.model || '').toLowerCase() === (car.model || '').toLowerCase()
          )
        );

      const elaboratedCars = await elaborationService.elaborateCars(uniqueCarChoices, searchIntent, trace);
      
      // Construct intermediate result for translation
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const translatedResult = await translationService.translateResults(intermediateResult, language, trace);

      const carsWithImages = await enrichmentService.enrichCarsWithImages(translatedResult.cars, trace);

      const result = { searchIntent, suggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      return result;
    } catch (error) {
      logger.error('Error in refineCarsWithImages', { error, sessionId });
      throw error;
    }
  },

  /**
   * Verify that the AI provider (Ollama) is available
   */
  async verify(): Promise<boolean> {
    return await ollamaService.verifyOllama();
  }
};
