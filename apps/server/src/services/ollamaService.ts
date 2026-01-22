import "reflect-metadata";
import { injectable, inject } from 'inversify';
import { IOllamaService, SERVICE_IDENTIFIERS } from '../container/interfaces.js';
import { IPromptService } from '../container/interfaces.js';
import langfuse from '../utils/langfuse.js';

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
    // Simplified implementation
    return 'ministral-3:3b';
  }

  private getOperationType(operationName?: string): string {
    return 'general';
  }

async callOllama(messages: Message[], trace?: any, operationName?: string, modelOverride?: string): Promise<string> {
    const model = modelOverride || this.getModelForOperation(operationName);
    const opName = operationName || `ollama_call_${Date.now()}`;

    // Create generation from trace context if available, otherwise standalone
    let generation;
    if (trace && trace.generation) {
      generation = trace.generation({
        name: opName,
        model: model,
        input: { messages },
        startTime: new Date(),
      });
    } else {
      // Fallback: create standalone generation (shouldn't happen in normal flow)
      generation = langfuse.generation({
        name: opName,
        model: model,
        input: { messages },
        startTime: new Date(),
      });
    }

    try {
      // logger implementation would go here
      const start = performance.now();
      const controller = await this.connectionPool.getConnection(opName);

      // Simplified fetch for DI demo
      const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: false,
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      const durationMs = performance.now() - start;
      const result = data.message?.content || '';

      // Update generation with results
      generation.update({
        output: { content: result },
        endTime: new Date(),
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        metadata: {
          operationType: this.getOperationType(operationName),
          durationMs: Math.round(durationMs),
        }
      });

      // End the generation
      generation.end();
      
      this.connectionPool.releaseConnection(opName);
      return result;

    } catch (error) {
      this.connectionPool.releaseConnection(opName);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update generation with error
      generation.update({
        endTime: new Date(),
        statusMessage: `Ollama call failed: ${errorMessage}`,
        level: "ERROR"
      });
      generation.end();

      throw new Error(`Unable to connect to Ollama. ${errorMessage}`);
    } finally {
      this.connectionPool.releaseConnection(opName);
    }
  }

  parseJsonResponse(text: string): any {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async verifyOllama(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
      const data: any = await response.json();
      return data.models?.length > 0;
    } catch (error) {
      return false;
    }
  }

  async verifyImageContainsCar(carInfo: string, year: string | number, imageUrl: string, trace: any): Promise<boolean> {
    // Simplified implementation
    return true;
  }

  closeConnections(): void {
    this.connectionPool.closeAll();
  }
}

// Legacy export for backward compatibility
export const ollamaService = new OllamaService();