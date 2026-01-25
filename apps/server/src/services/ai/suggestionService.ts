import { Message as OllamaMessage } from '../ollamaService.js';
import { injectable, inject } from 'inversify';
import { ISuggestionService, IOllamaService, IPromptService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';

@injectable()
export class SuggestionService implements ISuggestionService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  /**
   * Get car suggestions based on intent and context
   */
  async getCarSuggestions(searchIntent: any, context: string, pinnedCarsPrompt: string, trace: any): Promise<any> {
    const span = trace.span({ name: "get_car_suggestions" });
    try {
      const carsSuggestionTemplates = this.promptService.loadTemplate('cars_suggestions.md');
      const jsonGuard = this.promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        { role: "system", content: carsSuggestionTemplates },
        { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
        ...(pinnedCarsPrompt ? [{ role: "system" as const, content: pinnedCarsPrompt }] : []),
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await this.ollamaService.callOllama(messages, trace, 'car_suggestions');
      const result = this.ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
}
