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
  // Register core services
  container.bind<ICacheService>(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(CacheService).inSingletonScope();
  container.bind<IOllamaService>(SERVICE_IDENTIFIERS.OLLAMA_SERVICE).to(OllamaService).inSingletonScope();
  container.bind<IPromptService>(SERVICE_IDENTIFIERS.PROMPT_SERVICE).to(PromptService).inSingletonScope();
  container.bind<IImageSearchService>(SERVICE_IDENTIFIERS.IMAGE_SEARCH_SERVICE).to(ImageSearchService).inSingletonScope();
  container.bind<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE).to(ConversationService).inSingletonScope();
  
  // Register AI sub-services
  container.bind<IIntentService>(SERVICE_IDENTIFIERS.INTENT_SERVICE).to(IntentService).inSingletonScope();
  container.bind<ISuggestionService>(SERVICE_IDENTIFIERS.SUGGESTION_SERVICE).to(SuggestionService).inSingletonScope();
  container.bind<IElaborationService>(SERVICE_IDENTIFIERS.ELABORATION_SERVICE).to(ElaborationService).inSingletonScope();
  container.bind<ITranslationService>(SERVICE_IDENTIFIERS.TRANSLATION_SERVICE).to(TranslationService).inSingletonScope();
  container.bind<IEnrichmentService>(SERVICE_IDENTIFIERS.ENRICHMENT_SERVICE).to(EnrichmentService).inSingletonScope();
  container.bind<IJudgeService>(SERVICE_IDENTIFIERS.JUDGE_SERVICE).to(JudgeService).inSingletonScope();
  
  // Register main AI Service
  container.bind<IAIService>(SERVICE_IDENTIFIERS.AI_SERVICE).to(AIService).inSingletonScope();
}

// Don't auto-register to avoid duplicate bindings