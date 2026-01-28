import "reflect-metadata";
import { injectable, inject } from 'inversify';
import { IOllamaService, SERVICE_IDENTIFIERS } from '../container/interfaces.js';
import { IPromptService } from '../container/interfaces.js';
import langfuse from '../utils/langfuse.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { OllamaError } from '../utils/AppError.js';

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
      // logger implementation would go here
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

@injectable()
export class OllamaService implements IOllamaService {
  private connectionPool = new OllamaConnectionPool();

  constructor(
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

private getModelForOperation(operationName?: string): string {
    if (operationName?.includes('vision') || operationName?.includes('image')) {
      return config.ollama.models.vision;
    }
    
    // For cloud, you might want to use different models
    // This allows future customization for cloud-specific models
    return config.ollama.model;
  }

  private isCloudModel(modelName?: string): boolean {
    // Logic to determine if a model is cloud-specific
    // This can be extended with pattern matching or explicit lists
    const cloudPrefixes = ['cloud:', 'remote:', 'api:'];
    return cloudPrefixes.some(prefix => modelName?.startsWith(prefix)) || config.ollama.cloudEnabled;
  }

  private getOperationType(operationName?: string): string {
    if (operationName?.includes('translate')) return 'translation';
    if (operationName?.includes('intent')) return 'intent_determination';
    if (operationName?.includes('suggestion')) return 'suggestion_generation';
    if (operationName?.includes('elaborate')) return 'car_elaboration';
    if (operationName?.includes('vision')) return 'image_verification';
    return 'general';
  }

async callOllama(messages: Message[], trace?: any, operationName?: string, modelOverride?: string): Promise<string> {
    const model = modelOverride || this.getModelForOperation(operationName);
    const opName = operationName || `ollama_call_${Date.now()}`;
    
    // Determine if using cloud or local Ollama
    const isCloud = config.ollama.cloudEnabled;
    const apiUrl = isCloud ? `${config.ollama.cloudUrl}/api/chat` : `${config.ollama.url}/api/chat`;

    // Simplified fetch for DI demo
    try {
      logger.debug(`Calling Ollama API (${opName})`, { model, messageCount: messages.length, isCloud });
      const start = performance.now();
      const controller = await this.connectionPool.getConnection(opName);

      const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
      if (isCloud && config.ollama.cloudApiKey) {
        headers['Authorization'] = `Bearer ${config.ollama.cloudApiKey}`;
      }

// Parse options from config, fall back to defaults if parsing fails
      let options: any;
      try {
        options = config.ollama.options ? JSON.parse(config.ollama.options) : {
          temperature: 0,
          num_predict: 100000,
          top_p: 1,
          top_k: 5,
        };
      } catch (error) {
        logger.warn('Failed to parse OLLAMA_OPTIONS, using defaults', { 
          error: String(error),
          optionsString: config.ollama.options 
        });
        options = {
          temperature: 0,
          num_predict: 100000,
          top_p: 1,
          top_k: 5,
        };
      }

      let requestBody: any = {
        model: model,
        messages: messages,
        options: options,
        stream: false
      };

      // Add additional parameters only for local Ollama
      if (!isCloud) {
        requestBody = {
          ...requestBody,
          think: false,
          format: "json"
        };
      }

// Debug: log the exact request being sent
      const sanitizedHeaders = { ...headers };
      if (sanitizedHeaders.Authorization) {
        sanitizedHeaders.Authorization = '[REDACTED]';
      }
      if (sanitizedHeaders.authorization) {
        sanitizedHeaders.authorization = '[REDACTED]';
      }
      logger.debug('Ollama API Request', {
        url: apiUrl,
        headers: sanitizedHeaders,
        body: requestBody,
        isCloud: isCloud,
        model: model
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

if (!response.ok) {
        // Try to get detailed error message from response body
        let errorDetails = '';
        try {
          const errorData = await response.text();
          errorDetails = errorData;
        } catch (e) {
          errorDetails = 'Unable to read error response body';
        }
        
        logger.error('Ollama API error details', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          requestBody: requestBody,
          responseBody: errorDetails
        });
        
        throw new OllamaError(`Ollama API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
      }

      const data: any = await response.json();
      const durationMs = performance.now() - start;
      const result = data.message?.content || '';

      langfuse.generation({
        input: messages,
        output: result,
        traceId: trace?.id,
        name: operationName || 'ollama_call',
        model: model,
        startTime: new Date(Date.now() - durationMs),
        endTime: new Date(),
        usage: data.usage ? {
          input: data.usage.prompt_tokens || 0,
          output: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0,
        } : {
          input: data.prompt_eval_count || 0,
          output: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        metadata: {
          operationType: this.getOperationType(operationName),
          durationMs: Math.round(durationMs),
        }
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      langfuse.generation({
        traceId: trace?.id,
        name: opName,
        model: model,
        level: "ERROR",
        statusMessage: errorMessage
      });

      if (error instanceof OllamaError) throw error;
      throw new OllamaError(`Unable to connect to Ollama. ${errorMessage}`);
    } finally {
      this.connectionPool.releaseConnection(opName);
    }
  }

  parseJsonResponse(text: string): any {
    try {
      let cleaned = text.trim();
      if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
      } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
      }

      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('Failed to parse JSON response from Ollama', { text, error });
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

async verifyOllama(): Promise<boolean> {
    try {
      const isCloud = config.ollama.cloudEnabled;
      const apiUrl = isCloud ? `${config.ollama.cloudUrl}/api/tags` : `${config.ollama.url}/api/tags`;
      
      const headers: Record<string, string> = {};
      if (isCloud && config.ollama.cloudApiKey) {
        headers['Authorization'] = `Bearer ${config.ollama.cloudApiKey}`;
      }

      logger.debug(`Verifying Ollama connection`, { isCloud, apiUrl, model: config.ollama.model });

      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        logger.error(`Ollama API returned ${response.status}`, { apiUrl, isCloud });
        return false;
      }

      const data: any = await response.json();
      const models = data.models || [];
      
      logger.debug(`Available models:`, { count: models.length, models: models.map((m: any) => m.name) });

      // Try exact match first, then partial match
      const modelExists = models.some((m: any) => {
        const modelName = m.name || m.model;
        return modelName === config.ollama.model || modelName.includes(config.ollama.model);
      });

      if (!modelExists) {
        logger.warn(`Model ${config.ollama.model} not found in available models`, {
          availableModels: models.map((m: any) => m.name || m.model),
          requestedModel: config.ollama.model
        });
      }

      return modelExists;
    } catch (error) {
      logger.error('Ollama verification failed', { 
        error: error instanceof Error ? error.message : String(error),
        isCloud: config.ollama.cloudEnabled,
        url: config.ollama.cloudEnabled ? config.ollama.cloudUrl : config.ollama.url
      });
      return false;
    }
  }

  async verifyCloudConfiguration(): Promise<boolean> {
    if (!config.ollama.cloudEnabled) {
      return true; // Cloud not enabled, no need to verify
    }

    if (!config.ollama.cloudApiKey) {
      logger.warn('Ollama Cloud is enabled but API key is missing');
      return false;
    }

    if (!config.ollama.cloudUrl) {
      logger.warn('Ollama Cloud is enabled but URL is missing');
      return false;
    }

    try {
      const response = await fetch(`${config.ollama.cloudUrl}/api/tags`, {
        headers: { 'Authorization': `Bearer ${config.ollama.cloudApiKey}` }
      });
      return response.ok;
    } catch (error) {
      logger.error('Ollama Cloud configuration verification failed', { error });
      return false;
    }
  }

  async verifyImageContainsCar(carInfo: string, year: string | number, imageUrl: string, trace: any): Promise<boolean> {
    const span = trace.span ? trace.span({
      name: "verify_image_vision",
      metadata: { carInfo, year, imageUrl }
    }) : { end: () => {} };

    try {
      const visionPrompt = this.promptService.loadTemplate('verify-car.md');
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image for vision verification');
      
      const buffer = await response.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');

      const messages: Message[] = [
        {
          role: "user",
          content: visionPrompt
            .replace(/{carInfo}/g, `${carInfo} (${year})`),
          images: [base64Image]
        }
      ];

      const llmResponse = await this.callOllama(messages, trace, 'vision_verification');
      const result = this.parseJsonResponse(llmResponse);
      
      const isValid = (result.modelConfidence > 0.8) && (result.textConfidence < 0.2);
      
      if (span.end) span.end({ output: { ...result, isValid } });
      return isValid;
    } catch (error) {
      logger.warn('Vision verification failed, falling back to true', { error: String(error) });
      if (span.end) span.end({ level: "WARNING", statusMessage: String(error) });
      return false;
    }
  }

  closeConnections(): void {
    this.connectionPool.closeAll();
  }
}