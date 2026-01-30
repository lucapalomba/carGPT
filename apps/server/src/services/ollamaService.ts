import "reflect-metadata";
import { injectable, inject } from 'inversify';
import { IOllamaService, SERVICE_IDENTIFIERS } from '../container/interfaces.js';
import { IPromptService } from '../container/interfaces.js';
import langfuse from '../utils/langfuse.js';
import { forceFlushLangfuse } from '../utils/langfuseUtils.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { OllamaError } from '../utils/AppError.js';
import { StructuredOutputValidator, SCHEMA_DESCRIPTIONS } from '../utils/structuredOutput.js';
import * as z from 'zod';
import { CarSuggestionsSchema, ElaborationSchema, JudgeVerdictSchema, SearchIntentSchema, VerifyCarSchema } from '../utils/schemas.js';

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

  /**
   * Calls Ollama with structured output validation
   */
  async callOllamaStructured<T>(
    messages: Message[], 
    schema: z.ZodType<T>, 
    schemaDescription: string,
    trace?: any,
    operationName?: string,
    modelOverride?: string
  ): Promise<T> {
    const model = modelOverride || this.getModelForOperation(operationName);
    const opName = operationName || `ollama_structured_${Date.now()}`;
    
    // Determine if using cloud or local Ollama
    const isCloud = config.ollama.cloudEnabled;
    const apiUrl = isCloud ? `${config.ollama.cloudUrl}/api/chat` : `${config.ollama.url}/api/chat`;

    try {
      logger.debug(`Calling Ollama API with structured output (${opName})`, { model, messageCount: messages.length, isCloud });
      const start = performance.now();
      const controller = await this.connectionPool.getConnection(opName);

      

      const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
      if (isCloud && config.ollama.cloudApiKey) {
        headers['Authorization'] = `Bearer ${config.ollama.cloudApiKey}`;
      }

      // Parse options from config
      let options: any;
      try {
        options = JSON.parse(config.ollama.options);
      } catch (error) {
        logger.error('Failed to parse OLLAMA_OPTIONS, using defaults', { 
          error: String(error),
          optionsString: config.ollama.options 
        });
       throw new OllamaError(`Ollama API no configuration`);
      }

      // Convert Zod schema to JSON schema for Ollama
      const jsonSchema = StructuredOutputValidator.convertSchema(schema);
      
      // Log the schema for debugging
      logger.debug('Generated JSON Schema', { 
        schema: jsonSchema,
        schemaType: schema.constructor.name
      });

      const requestBody = {
        model: model,
        messages: messages,
        options: options,
        stream: false,
        format: jsonSchema // Use the JSON schema as the format parameter
      };

      const sanitizedHeaders = { ...headers };
      if (sanitizedHeaders.Authorization) sanitizedHeaders.Authorization = '[REDACTED]';

      logger.debug('Ollama API Request (Structured)', {
        url: apiUrl,
        headers: sanitizedHeaders,
        body: { ...requestBody }, // Don't log full schema to keep logs clean
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
        let errorDetails = '';
        try {
          const errorData = await response.text();
          errorDetails = errorData;
        } catch (_e) {
          errorDetails = 'Unable to read error response body';
        }
        
        logger.error('Ollama API error details (Structured)', {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl,
          error: errorDetails
        });
        
        throw new OllamaError(`Ollama API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
      }

      const data: any = await response.json();
      const durationMs = performance.now() - start;
      const rawResult = data.message?.content || '';
      
      // Parse the JSON response since we're relying on Ollama's format property
      const result = this.parseJsonResponse(rawResult);

      logger.debug('Ollama API Response (Structured)', {
        operationName: opName,
        status: response.status,
        statusText: response.statusText,
        url: apiUrl,
        result: rawResult,
        parsedResult: result,
        schema: schema
      });
       

langfuse.generation({
        input: messages,
        output: result,
        traceId: trace?.id,
        name: operationName || 'ollama_structured_call',
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
          structuredOutput: true,
          schemaValidation: 'passed'
        }
      });

      // Force flush for immediate visibility in Langfuse
      try {
        await forceFlushLangfuse();
      } catch (flushError) {
        logger.warn('Failed to force flush Langfuse traces:', flushError);
      }

      return result as T;

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
      throw new OllamaError(`Ollama Problem. ${errorMessage}`);
    } finally {
      this.connectionPool.releaseConnection(opName);
    }
  }



  /**
   * Convenience method for intent analysis with structured output
   */
  async analyzeIntent(
    query: string,
    trace?: any,
    modelOverride?: string
  ): Promise<any> {
    const messages: Message[] = [{
      role: 'user',
      content: `Analyze the user intent: ${query}`
    }];

    return this.callOllamaStructured(
      messages,
      SearchIntentSchema,
      SCHEMA_DESCRIPTIONS.SEARCH_INTENT,
      trace,
      'intent_analysis',
      modelOverride
    );
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

      const result = await this.callOllamaStructured(messages, VerifyCarSchema, "Vision verification", trace, 'vision_verification');
      
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



  /**
   * Analyze user intent with structured output
   */


  /**
   * Generate suggestions with structured output
   */
  async generateSuggestions(
    context: string, 
    trace?: any, 
    modelOverride?: string
  ): Promise<any> {
    const messages: Message[] = [{
      role: 'user',
      content: `Generate suggestions based on: ${context}`
    }];

    return this.callOllamaStructured(
      messages,
      CarSuggestionsSchema,
      'Car suggestions based on user context and previous interactions',
      trace,
      'suggestion_generation',
      modelOverride
    );
  }

  /**
   * Elaborate content with structured output
   */
  async elaborateContent(
    summary: string, 
    context: string, 
    trace?: any, 
    modelOverride?: string
  ): Promise<any> {
    const messages: Message[] = [{
      role: 'user',
      content: `Elaborate on this content with context: ${summary}. Context: ${context}`
    }];

    return this.callOllamaStructured(
      messages,
      ElaborationSchema,
      'Detailed elaboration of car information with technical specifications and use cases',
      trace,
      'content_elaboration',
      modelOverride
    );
  }

  /**
   * Evaluate decision with structured output
   */
  async evaluateDecision(
    options: any, 
    criteria: any, 
    trace?: any, 
    modelOverride?: string
  ): Promise<any> {
    const messages: Message[] = [{
      role: 'user',
      content: `Evaluate this decision. Options: ${JSON.stringify(options)}. Criteria: ${JSON.stringify(criteria)}`
    }];

    return this.callOllamaStructured(
      messages,
      JudgeVerdictSchema,
      'Comprehensive evaluation with scoring and justification',
      trace,
      'decision_evaluation',
      modelOverride
    );
  }
}