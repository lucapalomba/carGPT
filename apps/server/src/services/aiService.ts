import { ollamaService, Message as OllamaMessage } from './ollamaService.js';
import { imageSearchService } from './imageSearchService.js';
import logger from '../utils/logger.js';

/**
 * AI service that uses Ollama for car recommendations
 */
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
    jsonGuard: string
  ): Promise<any> {
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
        content: jsonGuard
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: requirements
      }
    ];

    const response = await ollamaService.callOllama(messages);
    const result = ollamaService.parseJsonResponse(response);

    // Validate structure
    const carsArray = result.cars || result.auto;
    if (!carsArray || !Array.isArray(carsArray)) {
      throw new Error('Invalid JSON structure - expected cars array');
    }

    // Fetch images for all cars in parallel
    logger.info(`Searching images for ${carsArray.length} cars`);
    const imageMap = await imageSearchService.searchMultipleCars(carsArray);

    // Enrich cars with images
    const carsWithImages = carsArray.map((car: any) => {
      const key = `${car.make}-${car.model}`;
      return {
        ...car,
        images: imageMap[key] || []
      };
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
  }
};
