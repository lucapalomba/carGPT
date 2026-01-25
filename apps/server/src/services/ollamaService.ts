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
    return config.ollama.model;
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

    // Simplified fetch for DI demo
    try {
      logger.debug(`Calling Ollama API (${opName})`, { model, messageCount: messages.length });
      const start = performance.now();
      const controller = await this.connectionPool.getConnection(opName);

      const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: messages,
          think: false,
          stream: false,
          options: {
            temperature: 0,
            num_predict: -1,
            top_p: 0.1,
            top_k: 5,
          },
          format: "json"
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new OllamaError(`Ollama API error: ${response.statusText}`);
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
      const response = await fetch(`${config.ollama.url}/api/tags`);
      const data: any = await response.json();
      const modelExists = data.models?.some((m: any) => m.name.includes(config.ollama.model));
      return !!modelExists;
    } catch (error) {
      logger.error('Ollama verification failed', { error });
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