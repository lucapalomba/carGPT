import { Container } from 'inversify';
import 'reflect-metadata';

import { 
  SERVICE_IDENTIFIERS,
  ICacheService,
  IOllamaService,
  IPromptService,
  IAIService,
  IIntentService,
  ISuggestionService,
  IElaborationService,
  ITranslationService,
  IEnrichmentService,
  IImageSearchService,
  IConversationService,
  IJudgeService
} from './interfaces.js';

// Export SERVICE_IDENTIFIERS for use in tests
export { SERVICE_IDENTIFIERS };

import { CacheService } from '../services/CacheService.js';
import { OllamaService } from '../services/ollamaService.js';
import { PromptService } from '../services/promptService.js';
import { AIService } from '../services/aiService.js';
import { ImageSearchService } from '../services/imageSearchService.js';
import { IntentService } from '../services/ai/intentService.js';
import { SuggestionService } from '../services/ai/suggestionService.js';
import { ElaborationService } from '../services/ai/elaborationService.js';
import { TranslationService } from '../services/ai/translationService.js';
import { EnrichmentService } from '../services/ai/enrichmentService.js';
import { ConversationService } from '../services/conversationService.js';
import { JudgeService } from '../services/ai/judgeService.js';

// Create and export DI container
export const container = new Container();

export function registerDependencies(): void {
  // Idempotent: skip bindings that already exist so calling this twice cannot
  // create duplicate (ambiguous) bindings.
  const bind = <T>(identifier: symbol, implementation: new (...args: any[]) => T): void => { /* eslint-disable-line @typescript-eslint/no-explicit-any */
    if (!container.isBound(identifier)) {
      container.bind<T>(identifier).to(implementation).inSingletonScope();
    }
  };

  // Register core services
  bind<ICacheService>(SERVICE_IDENTIFIERS.CACHE_SERVICE, CacheService);
  bind<IOllamaService>(SERVICE_IDENTIFIERS.OLLAMA_SERVICE, OllamaService);
  bind<IPromptService>(SERVICE_IDENTIFIERS.PROMPT_SERVICE, PromptService);
  bind<IImageSearchService>(SERVICE_IDENTIFIERS.IMAGE_SEARCH_SERVICE, ImageSearchService);
  bind<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE, ConversationService);

  // Register AI sub-services
  bind<IIntentService>(SERVICE_IDENTIFIERS.INTENT_SERVICE, IntentService);
  bind<ISuggestionService>(SERVICE_IDENTIFIERS.SUGGESTION_SERVICE, SuggestionService);
  bind<IElaborationService>(SERVICE_IDENTIFIERS.ELABORATION_SERVICE, ElaborationService);
  bind<ITranslationService>(SERVICE_IDENTIFIERS.TRANSLATION_SERVICE, TranslationService);
  bind<IEnrichmentService>(SERVICE_IDENTIFIERS.ENRICHMENT_SERVICE, EnrichmentService);
  bind<IJudgeService>(SERVICE_IDENTIFIERS.JUDGE_SERVICE, JudgeService);

  // Register main AI Service
  bind<IAIService>(SERVICE_IDENTIFIERS.AI_SERVICE, AIService);
}

// Don't auto-register to avoid duplicate bindings