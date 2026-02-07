import { Message as OllamaMessage } from '../ollamaService.js';
import { injectable, inject } from 'inversify';
import { IIntentService, IOllamaService, IPromptService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import { getDateSystemMessage } from '../../utils/dateUtils.js';
import { config } from '../../config/index.js';

import { SearchIntentSchema } from '../../utils/schemas.js';

@injectable()
export class IntentService implements IIntentService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  /**
   * Determine search intent from user context
   */
  async determineSearchIntent(context: string, language: string, trace: any): Promise<any> {
    const span = trace.span({ name: "determine_search_intent" });
    try {
      const intentPromptTemplate = this.promptService.loadTemplate('search_intent.md');
      const jsonGuard = this.promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        { role: "system", content: "Today is: " + getDateSystemMessage() },
        { role: "system", content: intentPromptTemplate
          .replace(/\${language}/g, language)
          .replace(/\${maxInterestingPropertiesCount}/g, config.maxInterestingPropertiesCount.toString())
        },
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const result = await this.ollamaService.callOllamaStructured(
        messages, 
        SearchIntentSchema,
        trace, 
        'search_intent'
      );
      
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
}
