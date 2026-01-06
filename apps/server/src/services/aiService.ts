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
    logger.info('Finding cars with images using Ollama', {
      requirements: requirements.substring(0, 100),
      language
    });

    const jsonGuard = promptService.loadTemplate('json-guard.md');
    const tonePrompt = promptService.loadTemplate('tone.md').replace('${userLanguage}', language);

    const trace = langfuse.trace({
      name: "search_cars_API",
      sessionId: sessionId,
      metadata: {
        model: config.ollama.model,
        environment: config.isProduction ? 'production' : 'development'
      },
      input: requirements,
    });


    /**
     * Add a search for important search intent.
     */

    const intentPromptTemplate = promptService.loadTemplate('search_intent.md');

    const searchIntentMessages: OllamaMessage[] = [
      {
        role: "system",
        content: intentPromptTemplate.replace(/\${language}/g, language)
      },
      {
        role: "system",
        content: jsonGuard
      },
      {
        role: "user",
        content: requirements
      }
    ];

    const searchIntentResponse = await ollamaService.callOllama(searchIntentMessages, trace, 'search_intent');

    const searchIntentResult = ollamaService.parseJsonResponse(searchIntentResponse);

    /**
     * Suggest cars based on the search intent.
     */

    const carsSuggestionTemplates = promptService.loadTemplate('cars_suggestions.md');

    const carsSuggestionMessages: OllamaMessage[] = [
      {
        role: "system",
        content: carsSuggestionTemplates
      },
      {
        role: "system",
        content: "User intent JSON: " + JSON.stringify(searchIntentResult)
      },
      {
        role: "system",
        content: jsonGuard
      }
    ];

    const carsSuggestionResponse = await ollamaService.callOllama(carsSuggestionMessages, trace, 'cars_suggestions');

    const carsSuggestionResult = ollamaService.parseJsonResponse(carsSuggestionResponse);

    /**
     * Now glue the suggestion with the car presentation schema iteratively.
     */

    const carsElaborationTemplates = promptService.loadTemplate('elaborate_suggestion.md');
    const carResponseSchema = promptService.loadTemplate('car-response-schema.md');

    // Elaborate all cars in parallel
    const carElaborationPromises = (carsSuggestionResult.choices || []).map(async (carChoice: any) => {
      logger.info(`Elaborating car: ${carChoice.make} ${carChoice.model}`);
      
      const carsElaborationMessages: OllamaMessage[] = [
        {
          role: "system",
          content: carsElaborationTemplates
        },
        {
          role: "system",
          content: "Current car to elaborate: " + JSON.stringify(carChoice)
        },
        {
          role: "system",
          content: "User intent JSON: " + JSON.stringify(searchIntentResult)
        },
        {
          role: "system",
          content: "Car response schema JSON: " + carResponseSchema
        },
        {
          role: "system",
          content: tonePrompt
        },
        {
          role: "system",
          content: jsonGuard
        },
      ];

      const response = await ollamaService.callOllama(carsElaborationMessages, trace, `elaborate_suggestion_${carChoice.make}_${carChoice.model}`);
      const elaborationResult = ollamaService.parseJsonResponse(response);
      
      // Merge: carChoice (original properties) enriched with elaborationResult.car
      // Elaboration preserves existing properties but can enrich/overwrite (like precise_model)
      return {
        ...carChoice,
        ...(elaborationResult.car || {})
      };
    });

    const carsArray = await Promise.all(carElaborationPromises);

    // Fetch images for all cars in parallel
    logger.info(`Searching images for ${carsArray.length} cars`);
    const imageMap = await imageSearchService.searchMultipleCars(carsArray, trace);

    // Enrich cars with images
    const carsWithImages = await Promise.all(carsArray.map(async (car: Car) => {
      const key = `${car.make}-${car.model}`;
      const rawImages = imageMap[key] || [];
      const verifiedImages = await this.filterImages(car.make, car.model, car.year, rawImages, trace);
      return {
        ...car,
        images: verifiedImages
      };
    }));

    return {
      ...searchIntentResult,
      ...carsSuggestionResult,
      cars: carsWithImages
    };
  },

  /**
   * Refine car suggestions with images using Ollama
   */
  async refineCarsWithImages(
    messages: OllamaMessage[],
    sessionId: string,
    userInput: string
  ): Promise<SearchResponse> {
    logger.info('Refining cars with images using Ollama');

    const trace = langfuse.trace({
      name: "refine_cars_API",
      input: userInput,
      sessionId: sessionId,
    });

    const response = await ollamaService.callOllama(messages, trace, 'refine_search_cars');
    const result = ollamaService.parseJsonResponse(response);

    // Validate structure
    const carsArray = result.cars || result.auto;
    if (!carsArray || !Array.isArray(carsArray)) {
      throw new Error('Invalid JSON structure - expected cars array');
    }

    // Fetch images for all cars in parallel
    logger.info(`Searching images for ${carsArray.length} cars`);
    const imageMap = await imageSearchService.searchMultipleCars(carsArray, trace);

    // Enrich cars with images
    const carsWithImages = await Promise.all(carsArray.map(async (car: Car) => {
      const key = `${car.make}-${car.model}`;
      const rawImages = imageMap[key] || [];
      const verifiedImages = await this.filterImages(car.make, car.model, car.year, rawImages, trace);
      return {
        ...car,
        images: verifiedImages
      };
    }));

    trace.update({
      output: {
        ...result,
        cars: carsWithImages
      }
    });

    return {
      ...result,
      cars: carsWithImages
    };
  },

  /**
   * Verify that the AI provider (Ollama) is available
   */
  async verify(): Promise<boolean> {
    logger.info('Verifying AI provider (Ollama)');
    return await ollamaService.verifyOllama();
  },

  /**
   * Filters images using vision to ensure they contain the specified car
   */
  async filterImages(make: string, model: string, year: string | number, images: unknown[], trace: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): Promise<any[]> {
    if (images.length === 0) return [];

    logger.info(`Filtering ${images.length} images for ${year} ${make} ${model} using vision`);

    const carInfo = `${make} ${model}`;
    const verifiedImages = [];

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    for (const image of images as any[]) {
      // Use thumbnail for faster processing if available
      const urlToVerify = image.thumbnail || image.url;
      const isValid = await ollamaService.verifyImageContainsCar(carInfo, year, urlToVerify, trace);

      if (isValid) {
        verifiedImages.push(image);
      } else {
        logger.warn(`Image filtered out (not a ${year} ${carInfo}):`, { url: image.url });
      }
    }

    return verifiedImages;
  }
};
