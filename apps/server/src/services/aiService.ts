import { ollamaService, Message as OllamaMessage } from './ollamaService.js';
import { imageSearchService } from './imageSearchService.js';
import logger from '../utils/logger.js';
import { langfuse } from '../utils/langfuse.js';
import { config } from '../config/index.js';

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
    systemPrompt: string,
    searchRules: string,
    responseSchema: string,
    jsonGuard: string,
    tonePrompt: string,

    sessionId: string
  ): Promise<SearchResponse> {
    logger.info('Finding cars with images using Ollama', { 
      requirements: requirements.substring(0, 100),
      language
    });

    const messages: OllamaMessage[] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "system",
        content: tonePrompt
      },
      {
        role: "system",
        content: searchRules
      },
      {
        role: "system",
        content: responseSchema
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

    const trace = langfuse.trace({
      name: "search_cars_API",
      sessionId: sessionId,
      metadata: {
        model: config.ollama.model,
        environment: config.isProduction ? 'production' : 'development'
      },
      input: requirements,
    });

    const response = await ollamaService.callOllama(messages, trace, 'search_cars');
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

    return {
      ...result,
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
