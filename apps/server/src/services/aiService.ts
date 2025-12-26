import { config } from '../config/index.js';
import { ollamaService, Message as OllamaMessage } from './ollamaService.js';
import { imageSearchService } from './imageSearchService.js';
import logger from '../utils/logger.js';

/**
 * Unified AI service that can use either Ollama or Claude (Anthropic)
 */
export const aiService = {
  /**
   * Get car recommendations with images using the configured AI provider
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
    const provider = config.aiProvider;
    
    logger.info('Finding cars with images', { 
      provider,
      requirements: requirements.substring(0, 100),
      language
    });

      return await this.findCarsWithOllama(requirements, language, systemPrompt, jsonGuard);
  },


  /**
   * Find cars using Ollama and then fetch images separately
   */
  async findCarsWithOllama(
    requirements: string,
    language: string,
    systemPrompt: string,
    jsonGuard: string
  ): Promise<any> {
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
   * Verify that the configured AI provider is available
   */
  async verify(): Promise<boolean> {
    const provider = config.aiProvider;
    
    logger.info('Verifying AI provider', { provider });

    return await ollamaService.verifyOllama();
  }
};
