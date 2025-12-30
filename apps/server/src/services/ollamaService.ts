import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { OllamaError } from '../utils/AppError.js';
import { promptService } from './promptService.js';

export interface Message {
  role: string;
  content: string;
  images?: string[];
}

/**
 * Service to handle communication with Ollama
 */
export const ollamaService = {
  /**
   * Sends a list of messages to Ollama and returns the content of the response.
   * 
   * @param {Array<Object>} messages - Array of message objects {role, content}
   * @param {Array<Message>} messages - Array of message objects {role, content}
   * @param {string} format - Optional format (e.g., "json")
   * @returns {Promise<string>} The response content from Ollama
   * @throws {Error} If the connection fails or Ollama returns an error
   */
  async callOllama(messages: Message[], format?: string) {
    try {
      logger.debug('Calling Ollama API', { 
        model: config.ollama.model,
        messagesCount: messages.length,
        // Logging the compiled prompt for debugging
        fullPrompt: messages 
      });

      const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ollama.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0,
            num_predict: 2500
          },
          format: "json"
        })
      });

      if (!response.ok) {
        throw new OllamaError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      logger.debug('Ollama API response received');
      return data.message.content;

    } catch (error: any) {
      if (error instanceof OllamaError) {
        throw error;
      }
      
      logger.error('Ollama connection failed', { 
        error: error.message,
        url: config.ollama.url
      });
      throw new OllamaError('Unable to connect to Ollama. Ensure Ollama is running (ollama serve)');
    }
  },

  /**
   * Attempts to parse a JSON response from the LLM, cleaning it of common issues.
   * 
   * @param {string} text - The raw text response from the LLM
   * @param {string} text - The raw text response from the LLM
   * @returns {any} The parsed JSON object
   * @throws {Error} If parsing fails after cleaning attempts
   */
  parseJsonResponse(text: string): any {
    // Remove markdown code blocks
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    cleaned = cleaned.replace(/'\s*/g, '');
    cleaned = cleaned.trim();

    // Try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Fix common JSON issues from LLMs
    // 1. Replace single quotes with double quotes (but not inside strings)
    cleaned = cleaned.replace(/'/g, '"');

    // 2. Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // 3. Try to parse
    try {
      return JSON.parse(cleaned);
    } catch (firstError: any) {
      // If still failing, try more aggressive cleaning
      logger.warn('First JSON parse attempt failed', { error: firstError.message, text: cleaned.substring(0, 100) + '...' });

      // Try to extract just the JSON part more carefully
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch (secondError: any) {
          logger.error('Second JSON parse attempt failed', { error: secondError.message });
          throw new Error(`Failed to parse JSON: ${firstError.message}`);
        }
      }
      throw firstError;
    }
  },

  /**
   * Verifies if the configured Ollama model is available.
   * 
   * @returns {Promise<boolean>} True if the model is available, false otherwise
   */
  async verifyOllama(): Promise<boolean> {
    try {
      const response = await fetch(`${config.ollama.url}/api/tags`);
      const data: any = await response.json();

      const modelExists = data.models.some((m: any) => m.name.includes(config.ollama.model));

      if (!modelExists) {
        logger.warn(`Model ${config.ollama.model} not found! Run: ollama pull ${config.ollama.model}`);
        return false;
      }

      logger.info('Ollama connected', { model: config.ollama.model });
      return true;
    } catch (error: any) {
      logger.error('Ollama not reachable!', { url: config.ollama.url, error: error.message });
      return false;
    }
  },

  /**
   * Verifies if an image contains the searched car using vision
   */
  async verifyImageContainsCar(carInfo: string, year: string | number, imageUrl: string): Promise<boolean> {
    try {
      logger.info(`[Vision] Checking if image contains ${year} ${carInfo}...`, { imageUrl });

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        logger.warn(`[Vision] Failed to fetch image: ${imageUrl}`, { status: imgRes.status });
        return false;
      }

      const buffer = await imgRes.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      logger.debug(`[Vision] Image fetched and converted to base64 (${Math.round(base64Image.length / 1024)} KB)`);

      const checkImagePrompt = promptService.loadTemplate('verify-car.md');

      const messages: Message[] = [
        {
          role: 'user',
          content: checkImagePrompt
            .replace('{carInfo}', carInfo)
            .replace('{year}', year.toString()),
          images: [base64Image]
        }
      ];

      const response = await this.callOllama(messages, 'json');
      const data = this.parseJsonResponse(response);
      const isMatch = !!data.containsCar;

      if (isMatch) {
        logger.info(`[Vision] ✅ Match found: This image is a ${year} ${carInfo}`, { imageUrl });
      } else {
        logger.info(`[Vision] ❌ No match: Not a ${year} ${carInfo}`, { imageUrl });
      }

      logger.debug('Image verification full response', { response });
      return isMatch;
    } catch (error: any) {
      logger.error('[Vision] Error verifying image with Ollama', { error: error.message, imageUrl });
      return false;
    }
  }
};
