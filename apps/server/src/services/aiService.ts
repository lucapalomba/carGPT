import { ollamaService, Message as OllamaMessage } from './ollamaService.js';
import { imageSearchService } from './imageSearchService.js';
import logger from '../utils/logger.js';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';
import { promptService } from '../services/promptService.js';

/**
 * AI service that uses Ollama for car recommendations
 */
export interface Car {
  make: string;
  model: string;
  year: number | string;
  pinned?: boolean;
  [key: string]: unknown;
}

export interface SearchResponse {
  cars: Car[];
  analysis?: string;
  auto?: Car[]; // For some LLM responses that might stick to 'auto' key
  userLanguage?: string;
  user_market?: string;
  [key: string]: unknown;
}

export const aiService = {
  /**
   * Get car recommendations with images using Ollama
   * 
   * @param requirements - User requirements for car search
   * @param language - User's preferred language
   * @param systemPrompt - System prompt template
   * @param jsonGuard - JSON formatting instructions
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
      
      const searchIntent = await this.determineSearchIntent(requirements, language, trace);
      const suggestions = await this.getCarSuggestions(searchIntent, requirements, '', trace);
      
      const tonePrompt = promptService.loadTemplate('tone.md').replace('${userLanguage}', language);
      const elaboratedCars = await this.elaborateCars(suggestions.choices || [], searchIntent, tonePrompt, trace);
      
      // Construct intermediate result for translation
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const translatedResult = await this.translateResults(intermediateResult, language, trace);

      const carsWithImages = await this.enrichCarsWithImages(translatedResult.cars, trace);

      const result = { searchIntent, suggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      return result;
    } catch (error) {
      logger.error('Error in findCarsWithImages', { error, sessionId });
      // Trace stays open as a placeholder for the error, but root trace doesn't support 'level' in update
      // We rely on the spans within the trace to show the error level
      throw error;
    }
  },

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
      const searchIntent = await this.determineSearchIntent(context, language, trace);
      
      const pinnedCarsPrompt = pinnedCars.length > 0 
        ? `IMPORTANT: The user has previously pinned the following cars. You MUST include these EXACT cars in your "pinned_cars" array in the response.\n\n` +
          `For each of these cars, you must:\n` +
          `1. Re-evaluate his "percentage" based on the new intent.\n` +
          `2. Provide a new "selection_reasoning" explaining why it is still relevant.\n` +
          `3. Ensure the "configuration" and "precise_model" are accurate.\n\n` +
          `Pinned Cars to include:\n${pinnedCars.map(c => `- ${c.make} ${c.model} (${c.year})`).join('\n')}`
        : '';

      const suggestions = await this.getCarSuggestions(searchIntent, context, pinnedCarsPrompt, trace);
      
      // Merge and deduplicate pinned + new suggestions
      const resultChoices = [...(suggestions.pinned_cars || []), ...(suggestions.choices || [])];

      const uniqueCarChoices = resultChoices
        .filter((car, index, self) => 
          index === self.findIndex((c) => 
            (c.make || '').toLowerCase() === (car.make || '').toLowerCase() && 
            (c.model || '').toLowerCase() === (car.model || '').toLowerCase()
          )
        );

      const tonePrompt = promptService.loadTemplate('tone.md').replace('${userLanguage}', language);
      const elaboratedCars = await this.elaborateCars(uniqueCarChoices, searchIntent, tonePrompt, trace);
      
      // Construct intermediate result for translation
      const intermediateResult = { analysis: suggestions.analysis, cars: elaboratedCars };
      const translatedResult = await this.translateResults(intermediateResult, language, trace);

      const carsWithImages = await this.enrichCarsWithImages(translatedResult.cars, trace);

      const result = { searchIntent, suggestions, ...translatedResult, cars: carsWithImages };
      trace.update({ output: result });
      return result;
    } catch (error) {
      logger.error('Error in refineCarsWithImages', { error, sessionId });
      throw error;
    }
  },

  /**
   * Internal helper to determine search intent
   */
  async determineSearchIntent(context: string, language: string, trace: any): Promise<any> {
    const span = trace.span({ name: "determine_search_intent" });
    try {
      const intentPromptTemplate = promptService.loadTemplate('search_intent.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        { role: "system", content: intentPromptTemplate.replace(/\${language}/g, language) },
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'search_intent');
      const result = ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  },

  /**
   * Internal helper to get car suggestions
   */
  async getCarSuggestions(searchIntent: any, context: string, pinnedCarsPrompt: string, trace: any): Promise<any> {
    const span = trace.span({ name: "get_car_suggestions" });
    try {
      const carsSuggestionTemplates = promptService.loadTemplate('cars_suggestions.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        { role: "system", content: carsSuggestionTemplates },
        { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
        ...(pinnedCarsPrompt ? [{ role: "system" as const, content: pinnedCarsPrompt }] : []),
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'car_suggestions');
      const result = ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  },

  /**
   * Internal helper to elaborate car details
   */
  async elaborateCars(carChoices: any[], searchIntent: any, tonePrompt: string, trace: any): Promise<Car[]> {
    const span = trace.span({ name: "elaborate_cars_parallel", input: { count: carChoices.length } });
    try {
      const carsElaborationTemplates = promptService.loadTemplate('elaborate_suggestion.md');
      const carResponseSchema = promptService.loadTemplate('car-response-schema.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      const elaboratedCars = await Promise.all(carChoices.map(async (carChoice: any) => {
        try {
          const messages: OllamaMessage[] = [
            { role: "system", content: carsElaborationTemplates },
            { role: "system", content: "Current car to elaborate: " + JSON.stringify(carChoice) },
            { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
            { role: "system", content: "Car response schema JSON: " + carResponseSchema },
            { role: "system", content: tonePrompt },
            { role: "system", content: jsonGuard }
          ];

          const response = await ollamaService.callOllama(messages, trace, `elaborate_${carChoice.make}_${carChoice.model}`);
          const result = ollamaService.parseJsonResponse(response);
          const merged = { ...carChoice, ...(result.car || {}) };
          return merged;
        } catch (error) {
          return carChoice; // Fallback to original choice if elaboration fails
        }
      }));

      span.end({ output: { count: elaboratedCars.length } });
      return elaboratedCars;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  },

  /**
   * Translates the search response to the target language
   * Translates each car individually and analysis separately for better reliability
   */
  async translateResults(
    results: any,
    targetLanguage: string,
    trace: any
  ): Promise<any> {
    const span = trace.span({ 
      name: "translate_results",
      metadata: { targetLanguage, carsCount: results.cars?.length }
    });
    
    logger.info(`Translating results to ${targetLanguage}`, { carsCount: results.cars?.length });

    try {
      // Translate analysis separately
      const translatedAnalysis = results.analysis 
        ? await this.translateAnalysis(results.analysis, targetLanguage, trace)
        : results.analysis;

      // Translate each car individually (in parallel)
      const originalCars = Array.isArray(results.cars) ? results.cars : [];
      const translatedCars = await Promise.all(
        originalCars.map((car, index) => this.translateSingleCar(car, targetLanguage, trace, index))
      );

      const translatedResult = {
        ...results,
        analysis: translatedAnalysis,
        cars: translatedCars
      };
      
      span.end({ output: { carsTranslated: translatedCars.length } });
      return translatedResult;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Translation failed, returning original results', { error: errorMessage });
      
      span.end({ level: "ERROR", statusMessage: errorMessage });
      return results; // Return original results if translation fails
    }
  },

  /**
   * Translates a single car object
   */
  async translateSingleCar(
    car: any,
    targetLanguage: string,
    trace: any,
    index: number
  ): Promise<any> {
    try {
      const translateCarTemplate = promptService.loadTemplate('translate-car.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        {
          role: "system",
          content: translateCarTemplate.replace(/\${targetLanguage}/g, targetLanguage)
        },
        {
          role: "system",
          content: jsonGuard
        },
        {
          role: "user",
          content: JSON.stringify(car)
        }
      ];

      const response = await ollamaService.callOllama(messages, trace, `translate_car_${car.make}_${car.model}`);
      const translatedCar = ollamaService.parseJsonResponse(response);
      
      // Validate the translated car maintains critical fields
      if (!this.validateCarTranslation(car, translatedCar)) {
        logger.warn('Car translation validation failed, using original', { 
          index, 
          make: car.make, 
          model: car.model 
        });
        return car;
      }

      // Preserve pinned status from original
      if (car.pinned !== undefined) {
        translatedCar.pinned = car.pinned;
      }

      return translatedCar;
    } catch (error) {
      logger.warn('Failed to translate car, using original', { 
        index, 
        make: car.make, 
        model: car.model,
        error: error instanceof Error ? error.message : String(error)
      });
      return car; // Return original car if translation fails
    }
  },

  /**
   * Translates the analysis text
   */
  async translateAnalysis(
    analysis: string,
    targetLanguage: string,
    trace: any
  ): Promise<string> {
    const span = trace.span({ 
      name: "translate_analysis",
      metadata: { targetLanguage, inputLength: analysis.length }
    });

    try {
      const translateAnalysisTemplate = promptService.loadTemplate('translate-analysis.md');

      const messages: OllamaMessage[] = [
        {
          role: "system",
          content: translateAnalysisTemplate.replace(/\${targetLanguage}/g, targetLanguage)
        },
        {
          role: "user",
          content: analysis
        }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'translate_analysis');
      
      // Parse JSON response and extract analysis
      const parsed = ollamaService.parseJsonResponse(response);
      const translatedText = parsed.analysis;
      
      if (!translatedText || translatedText.length < 10) {
        logger.warn('Analysis translation seems invalid, using original');
        span.end({ output: analysis, statusMessage: 'Invalid translation, using original' });
        return analysis;
      }

      span.end({ output: translatedText });
      return translatedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Failed to translate analysis, using original', { error: errorMessage });
      span.end({ level: "ERROR", statusMessage: errorMessage });
      return analysis; // Return original analysis if translation fails
    }
  },

  /**
   * Validates that a translated car maintains critical unchanged fields
   * Only make, model, and year are critical identity fields that MUST match
   */
  validateCarTranslation(original: any, translated: any): boolean {
    if (!translated || typeof translated !== 'object') {
      logger.warn('Car translation: result is not an object');
      return false;
    }

    // Make and model must remain unchanged (identity fields)
    if (original.make !== translated.make) {
      logger.warn('Car translation: make changed', { original: original.make, translated: translated.make });
      return false;
    }
    if (original.model !== translated.model) {
      logger.warn('Car translation: model changed', { original: original.model, translated: translated.model });
      return false;
    }

    // Year must remain unchanged (identity field)
    if (original.year !== translated.year) {
      logger.warn('Car translation: year changed', { original: original.year, translated: translated.year });
      return false;
    }

    // Percentage - warn but don't fail (LLM might change slightly)
    if (original.percentage !== translated.percentage) {
      logger.warn('Car translation: percentage changed (keeping translated)', { 
        original: original.percentage, 
        translated: translated.percentage 
      });
      // Fix: copy original percentage to translated
      translated.percentage = original.percentage;
    }

    // precise_model - warn but don't fail
    if (original.precise_model !== translated.precise_model) {
      logger.warn('Car translation: precise_model changed (keeping original)', { 
        original: original.precise_model, 
        translated: translated.precise_model 
      });
      // Fix: copy original precise_model to translated
      translated.precise_model = original.precise_model;
    }

    // configuration - warn but don't fail
    if (original.configuration !== translated.configuration) {
      logger.warn('Car translation: configuration changed (keeping original)', { 
        original: original.configuration, 
        translated: original.configuration 
      });
      // Fix: copy original configuration to translated
      translated.configuration = original.configuration;
    }

    return true;
  },

  /**
   * Internal helper to enrich cars with images
   */
  async enrichCarsWithImages(cars: Car[] = [], trace: any): Promise<Car[]> {
    const carList = Array.isArray(cars) ? cars : [];
    const span = trace.span({ name: "enrich_with_images", input: { count: carList.length } });
    try {
      if (carList.length === 0) {
        span.end({ output: { count: 0 } });
        return [];
      }
      logger.info(`Searching images for ${carList.length} cars`);
      const imageMap = await imageSearchService.searchMultipleCars(
        carList.map(c => ({ make: c.make, model: c.model, year: c.year?.toString() })), 
        trace
      );

      const carsWithImages = await Promise.all(carList.map(async (car: Car) => {
        const key = `${car.make}-${car.model}`;
        const rawImages = imageMap[key] || [];
        const verifiedImages = await this.filterImages(car.make, car.model, car.year, rawImages, trace);
        return { ...car, images: verifiedImages };
      }));

      span.end({ output: { count: carsWithImages.length } });
      return carsWithImages;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  },

  /**
   * Verify that the AI provider (Ollama) is available
   */
  async verify(): Promise<boolean> {
    return await ollamaService.verifyOllama();
  },

  /**
   * Filters images using vision to ensure they contain the specified car
   */
  async filterImages(make: string, model: string, year: string | number, images: unknown[], trace: any): Promise<any[]> {
    if (images.length === 0) return [];
    const span = trace.span({ name: "filter_images_vision", input: { make, model, count: images.length } });
    
    try {
      const carInfo = `${make} ${model}`;
      const verifiedImages = [];

      for (const image of (images as any[])) {
        const urlToVerify = image.thumbnail || image.url;
        const isValid = await ollamaService.verifyImageContainsCar(carInfo, year, urlToVerify, trace);
        if (isValid) verifiedImages.push(image);
      }

      span.end({ output: { verifiedCount: verifiedImages.length } });
      return verifiedImages;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      return images.slice(0, 3); // Fallback to first 3 images if vision fails
    }
  }
};
