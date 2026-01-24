import { ollamaService, Message as OllamaMessage } from '../ollamaService.js';
import { promptService } from '../promptService.js';
import { getDateSystemMessage } from '../../utils/dateUtils.js';

export const intentService = {
  /**
   * Determine search intent from user context
   */
  async determineSearchIntent(context: string, language: string, trace: any): Promise<any> {
    const span = trace.span({ name: "determine_search_intent" });
    try {
      const intentPromptTemplate = promptService.loadTemplate('search_intent.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

const messages: OllamaMessage[] = [
        { role: "system", content: "Today is: " + getDateSystemMessage() },
        { role: "system", content: intentPromptTemplate.replace(/\${language}/g, language) },
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'search_intent');
      const result = ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
};
