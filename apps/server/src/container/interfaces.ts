import { Car, SearchResponse } from '../services/ai/types.js';
import { Conversation } from '../services/conversationService.js';

// Core service interfaces
export interface ICacheService {
  set<T>(key: string, data: T, ttlMs?: number): void;
  get<T>(key: string): T | null;
  clear(): void;
  generateKey(prefix: string, ...args: (string | number)[]): string;
  getCacheStats(): { size: number; keys: string[] };
}

export interface IConversationService {
  get(sessionId: string): Conversation | undefined;
  getOrInitialize(sessionId: string): Conversation;
  delete(sessionId: string): void;
  getAll(): [string, Conversation][];
  count(): number;
}

export interface IImageSearchService {
  searchCarImages(make: string, model: string, year: string, count: number): Promise<any[]>;
  searchMultipleCars(cars: Array<{ make: string; model: string; year?: string }>): Promise<Record<string, any[]>>;
}

export interface IOllamaService {
  callOllama(messages: any[], trace?: any, operationName?: string, modelOverride?: string): Promise<string>;
  parseJsonResponse(text: string): any;
  verifyOllama(): Promise<boolean>;
  verifyImageContainsCar(carInfo: string, year: string | number, imageUrl: string, trace: any): Promise<boolean>;
  closeConnections(): void;
}

export interface IIntentService {
  determineSearchIntent(requirements: string, language: string, trace?: any): Promise<any>;
}

export interface ISuggestionService {
  getCarSuggestions(searchIntent: any, requirements: string, pinnedCarsPrompt: string, trace?: any): Promise<any>;
}

export interface IElaborationService {
  elaborateCars(cars: any[], searchIntent: any, trace?: any): Promise<Car[]>;
}

export interface ITranslationService {
  translateResults(result: any, language: string, trace?: any): Promise<SearchResponse>;
  translateSingleCar(car: any, targetLanguage: string, trace: any, index: number): Promise<any>;
  translateAnalysis(analysis: string, targetLanguage: string, trace: any): Promise<string>;
}

export interface IEnrichmentService {
  enrichCarsWithImages(cars: Car[], trace?: any): Promise<Car[]>;
  filterImages(make: string, model: string, year: string | number, images: unknown[], trace: any): Promise<any[]>;
}

export interface IPromptService {
  loadTemplate(templateName: string): string;
}

export interface IAIService {
  findCarsWithImages(requirements: string, language: string, sessionId: string): Promise<SearchResponse>;
  refineCarsWithImages(feedback: string, language: string, sessionId: string, fullContext: string, pinnedCars?: Car[]): Promise<SearchResponse>;
  verify(): Promise<boolean>;
  clearCache(): void;
  getCacheStats(): { size: number; keys: string[] };
}

// Service identifiers for DI
export const SERVICE_IDENTIFIERS = {
  CACHE_SERVICE: Symbol.for('CacheService'),
  IMAGE_SEARCH_SERVICE: Symbol.for('ImageSearchService'),
  OLLAMA_SERVICE: Symbol.for('OllamaService'),
  INTENT_SERVICE: Symbol.for('IntentService'),
  SUGGESTION_SERVICE: Symbol.for('SuggestionService'),
  ELABORATION_SERVICE: Symbol.for('ElaborationService'),
  TRANSLATION_SERVICE: Symbol.for('TranslationService'),
  ENRICHMENT_SERVICE: Symbol.for('EnrichmentService'),
  AI_SERVICE: Symbol.for('AI_SERVICE'),
  PROMPT_SERVICE: Symbol.for('PromptService'),
  CONVERSATION_SERVICE: Symbol.for('CONVERSATION_SERVICE'),
} as const;