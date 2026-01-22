import { Container } from 'inversify';
import 'reflect-metadata';

import { 
  SERVICE_IDENTIFIERS,
  ICacheService,
  IOllamaService,
  IPromptService,
  IAIService
} from './interfaces.js';

// Export SERVICE_IDENTIFIERS for use in tests
export { SERVICE_IDENTIFIERS };

import { CacheService } from '../services/CacheService';
import { OllamaService } from '../services/ollamaService';
import { promptService } from '../services/promptService';
import { AIService } from '../services/AIService';

// Create and export DI container
export const container = new Container();

export function registerDependencies(): void {
  // Register core services
  container.bind<ICacheService>(SERVICE_IDENTIFIERS.CACHE_SERVICE).to(CacheService);
  container.bind<IOllamaService>(SERVICE_IDENTIFIERS.OLLAMA_SERVICE).to(OllamaService);
  container.bind<IPromptService>(SERVICE_IDENTIFIERS.PROMPT_SERVICE).toConstantValue(promptService);
  container.bind<IAIService>(SERVICE_IDENTIFIERS.AI_SERVICE).to(AIService);
}

// Don't auto-register to avoid duplicate bindings