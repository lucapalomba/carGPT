import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { OllamaError } from '../utils/AppError.js';
import { promptService } from './promptService.js';
import { langfuse } from '../utils/langfuse.js';

export interface Message {
  role: string;
  content: string;
  images?: string[];
}

/**
 * Service to handle communication with Ollama
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const ollamaService = {
  /**
   * Sends a list of messages to Ollama and returns the content of the response.
   * 
   * @param {Array<Message>} messages - Array of message objects {role, content}
   * @param {any} trace - Optional Langfuse trace
   * @param {string} operationName - Optional operation name
   * @returns {Promise<string>} The response content from Ollama
   * @throws {Error} If the connection fails or Ollama returns an error
   */
  async callOllama(messages: Message[], trace?: any, operationName?: string) {

     const model = config.ollama.model;
     const ollamaResponseFormat = "json";
     const options = {
       temperature: 0,
       num_predict: -1,
     };
     const messagesCount = messages.length;

    try {
     
      logger.debug('Calling Ollama API', { 
        model,
        messagesCount,
        fullPrompt: messages 
      });

      const start = performance.now();

      const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          think: false,
          stream: false,
          options,
          format: ollamaResponseFormat
        })
      });

      const durationMs = performance.now() - start;

      if (!response.ok) {
        throw new OllamaError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      logger.debug('Ollama API response received');

      langfuse.generation({
        input: messages,
        output: data,
        traceId: trace?.id,
        name: operationName,
        model: model,
        modelParameters: options,
        startTime: new Date(Date.now() - durationMs),
        endTime: new Date(),
        usage: {
          input: data.prompt_eval_count,
          output: data.eval_count,
          total: data.prompt_eval_count + data.eval_count
        }
      });

      return data.message.content;

    } catch (error: unknown) {
      if (error instanceof OllamaError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Ollama connection failed', { 
        error: errorMessage,
        url: config.ollama.url
      });

      langfuse.generation({
        traceId: trace?.id,
        name: operationName,
        model: model,
        modelParameters: options,
        level: "ERROR",
        statusMessage: String(error)
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
    // Remove leading/trailing markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find JSON from the first '{' to the last '}'
    // This helps when the LLM adds text before or after the JSON
    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }

    // Fix common JSON issues from LLMs
    // NOTE: We do NOT globally replace single quotes with double quotes as it corrupts content like "driver's seat"
    
    // Remove trailing commas before closing braces/brackets (common LLM error)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Remove control characters that might break JSON.parse
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // Try to parse
    try {
      return JSON.parse(cleaned);
    } catch (firstError: unknown) {
      // If still failing, logging the error and re-throwing
      const firstErrorMessage = firstError instanceof Error ? firstError.message : String(firstError);
      logger.warn('JSON parse failed', { error: firstErrorMessage, textSnippet: cleaned.substring(0, 200) + '...' });
      
      // We could add more aggressive recovery here if needed, but avoiding destruction is the priority now.
      // Re-throwing the original error so the caller knows parsing failed.
      throw new Error(`Failed to parse JSON: ${firstErrorMessage}`);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Ollama not reachable!', { url: config.ollama.url, error: errorMessage });
      return false;
    }
  },

  /**
   * Verifies if an image contains the searched car using vision
   */
  async verifyImageContainsCar(carInfo: string, year: string | number, imageUrl: string, trace: any): Promise<boolean> {
    try {
      logger.info(`[Vision] Verifying ${year} ${carInfo}...`, { imageUrl });

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        logger.warn(`[Vision] Failed to fetch image: ${imageUrl}`, { status: imgRes.status });
        return false;
      }

      const buffer = await imgRes.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');

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

      const response = await this.callOllama(messages,trace, 'verify_image_' + carInfo);
      const data = this.parseJsonResponse(response);
      
      const modelConfidence = data.modelConfidence || 0;
      const textConfidence = data.textConfidence || 0;
      
      const modelThreshold = config.vision.modelConfidenceThreshold;
      const textThreshold = config.vision.textConfidenceThreshold;

      const isModelMatch = modelConfidence >= modelThreshold;
      const hasTooMuchText = textConfidence > textThreshold;
      
      const isMatch = isModelMatch && !hasTooMuchText;

      if (isMatch) {
        logger.info(`[Vision] ✅ Match! (Model: ${modelConfidence.toFixed(2)}, Text: ${textConfidence.toFixed(2)})`, { imageUrl });
      } else {
        const reason = !isModelMatch ? `Low model confidence (${modelConfidence.toFixed(2)} < ${modelThreshold})` : `Too much text (${textConfidence.toFixed(2)} > ${textThreshold})`;
        logger.info(`[Vision] ❌ Reject: (Model: ${modelConfidence.toFixed(2)}, Text: ${textConfidence.toFixed(2)}) ${reason}`, { imageUrl });
      }

      return isMatch;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[Vision] Error during verification', { error: errorMessage, imageUrl });
      return false;
    }
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
