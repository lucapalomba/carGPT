import { ollamaService, Message as OllamaMessage } from '../ollamaService.js';
import { promptService } from '../promptService.js';
import { getDateSystemMessage } from '../../utils/dateUtils.js';

export const suggestionService = {
  /**
   * Get car suggestions based on intent and context
   */
  async getCarSuggestions(searchIntent: any, context: string, pinnedCarsPrompt: string, trace: any): Promise<any> {
    const span = trace.span({ name: "get_car_suggestions" });
    try {
      const carsSuggestionTemplates = promptService.loadTemplate('cars_suggestions.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

const messages: OllamaMessage[] = [
        { role: "system", content: "Today is: " + getDateSystemMessage() },
        { role: "system", content: carsSuggestionTemplates },
        { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
        ...(pinnedCarsPrompt ? [{ role: "system" as const, content: pinnedCarsPrompt }] : []),
        { role: "system", content: jsonGuard },
        { role: "user", content: context }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'car_suggestions');
      const result = ollamaService.parseJsonResponse(response);
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
};
