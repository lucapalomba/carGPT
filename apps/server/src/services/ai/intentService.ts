import { Message as OllamaMessage } from '../ollamaService.js';
import { injectable, inject } from 'inversify';
import { IIntentService, IOllamaService, IPromptService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';

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
        { role: "system", content: intentPromptTemplate.replace(/\${language}/g, language) },
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await this.ollamaService.callOllama(messages, trace, 'search_intent');
      const result = this.ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
}
