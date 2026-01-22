import { Car, SearchResponse } from '../services/ai/types.js';

// Core service interfaces
export interface ICacheService {
  set<T>(key: string, data: T, ttlMs?: number): void;
  get<T>(key: string): T | null;
  clear(): void;
  generateKey(prefix: string, ...args: (string | number)[]): string;
  getCacheStats(): { size: number; keys: string[] };
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
}

export interface IEnrichmentService {
  enrichCarsWithImages(cars: Car[], trace?: any): Promise<Car[]>;
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
  CACHE_SERVICE: Symbol('CacheService'),
  IMAGE_SEARCH_SERVICE: Symbol('ImageSearchService'),
  OLLAMA_SERVICE: Symbol('OllamaService'),
  INTENT_SERVICE: Symbol('IntentService'),
  SUGGESTION_SERVICE: Symbol('SuggestionService'),
  ELABORATION_SERVICE: Symbol('ElaborationService'),
  TRANSLATION_SERVICE: Symbol('TranslationService'),
  ENRICHMENT_SERVICE: Symbol('EnrichmentService'),
  AI_SERVICE: Symbol('AIService'),
  PROMPT_SERVICE: Symbol('PromptService'),
} as const;