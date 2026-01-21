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
 * Connection pool for Ollama API requests
 */
class OllamaConnectionPool {
  private connections: Map<string, AbortController> = new Map();
  private maxConnections: number = 5;
  private activeConnections: number = 0;

  async getConnection(operationName: string): Promise<AbortController> {
    if (this.activeConnections >= this.maxConnections) {
      logger.warn('Ollama connection pool full, waiting for available connection', { operationName });
      await this.waitForConnection();
    }

    const controller = new AbortController();
    this.connections.set(operationName, controller);
    this.activeConnections++;
    
    return controller;
  }

  releaseConnection(operationName: string): void {
    this.connections.delete(operationName);
    this.activeConnections--;
  }

  private async waitForConnection(): Promise<void> {
    return new Promise(resolve => {
      const checkConnection = () => {
        if (this.activeConnections < this.maxConnections) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  closeAll(): void {
    this.connections.forEach(controller => controller.abort());
    this.connections.clear();
    this.activeConnections = 0;
  }
}

const connectionPool = new OllamaConnectionPool();

/**
 * Service to handle communication with Ollama
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const getModelForOperation = (operationName?: string): string => {
  if (!operationName) return config.ollama.model;
  
  if (operationName.includes('translate')) {
    return config.ollama.models.translation;
  }
  if (operationName.includes('suggestion')) {
    return config.ollama.models.suggestion;
  }
  if (operationName.includes('intent')) {
    return config.ollama.models.intent;
  }
  if (operationName.includes('elaborate')) {
    return config.ollama.models.elaboration;
  }
  if (operationName.includes('verify_image')) {
    return config.ollama.models.vision;
  }
  
  return config.ollama.model;
};

const getOperationType = (operationName?: string): string => {
  if (!operationName) return 'unknown';
  
  if (operationName.includes('translate')) {
    return 'translation';
  }
  if (operationName.includes('suggestion')) {
    return 'suggestion';
  }
  if (operationName.includes('intent')) {
    return 'intent';
  }
  if (operationName.includes('elaborate')) {
    return 'elaboration';
  }
  if (operationName.includes('verify_image')) {
    return 'vision';
  }
  
  return 'general';
};

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
 async callOllama(messages: Message[], trace?: any, operationName?: string, modelOverride?: string) {
      const model = modelOverride || getModelForOperation(operationName);
     const ollamaResponseFormat = "json";
     const options = {
       temperature: 0,
       num_predict: -1,
       top_p: 0.1,
       top_k: 5,
     };
     const messagesCount = messages.length;
     const opName = operationName || `ollama_call_${Date.now()}`;

    try {
     
      logger.debug('Calling Ollama API', { 
        model,
        messagesCount,
        operationName: opName
      });

      const start = performance.now();
      const controller = await connectionPool.getConnection(opName);

      const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          think: false,
          stream: false,
          options,
          format: ollamaResponseFormat
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new OllamaError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      const durationMs = performance.now() - start;
      logger.info('Ollama API response received', { 
        operationName, 
        durationMs: durationMs.toFixed(0),
        tokens: data.eval_count 
      });

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
        },
        metadata: {
          operationType: getOperationType(operationName),
          defaultModel: config.ollama.model,
          selectedModel: model
        }
      });

      connectionPool.releaseConnection(opName);
      return data.message.content;

} catch (error: unknown) {
      connectionPool.releaseConnection(opName);
      
      if (error instanceof OllamaError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Ollama connection failed', { 
        error: errorMessage,
        url: config.ollama.url,
        operationName: opName
      });

      langfuse.generation({
        traceId: trace?.id,
        name: opName,
        model: model,
        modelParameters: options,
        level: "ERROR",
        statusMessage: String(error)
      });

      throw new OllamaError('Unable to connect to Ollama. Ensure Ollama is running (ollama serve)');
    } finally {
      connectionPool.releaseConnection(opName);
    }
  },

  /**
   * Attempts to parse a JSON response from the LLM, cleaning it of common issues.
   * 
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

    // Remove control characters that might break JSON.parse
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // Try to parse
    try {
      return JSON.parse(cleaned);
    } catch (firstError: unknown) {
      const firstErrorMessage = firstError instanceof Error ? firstError.message : String(firstError);
      logger.warn('JSON parse failed', { 
        error: firstErrorMessage, 
        textSnippet: cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned 
      });
      
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
},

  /**
   * Close all connections and cleanup resources
   */
  closeConnections(): void {
    connectionPool.closeAll();
    logger.info('Ollama connections closed');
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
