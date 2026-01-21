import { ollamaService, Message as OllamaMessage } from '../ollamaService.js';
import { promptService } from '../promptService.js';
import logger from '../../utils/logger.js';

export const uiService = {
  /**
   * Determine UI suggestions for vehicle properties based on search intent
   */
  async getUiSuggestions(searchIntent: any, trace: any): Promise<Record<string, any>> {
    const span = trace.span({ name: "get_ui_suggestions" });
    try {
      const uiPromptTemplate = promptService.loadTemplate('ui_suggestions.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      // Prepare input context from search intent
      // We mainly care about 'interesting_properties' but passing the whole intent is fine context
      const context = JSON.stringify({ 
        interesting_properties: searchIntent.interesting_properties || [] 
      }, null, 2);

      const messages: OllamaMessage[] = [
        { role: "system", content: uiPromptTemplate },
        { role: "system", content: jsonGuard },
        { role: "user", content: `Search Intent Context:\n${context}` }
      ];

      const response = await ollamaService.callOllama(messages, trace, 'ui_suggestions');
      const result = ollamaService.parseJsonResponse(response);
      
      span.end({ output: result });
      return result;
    } catch (error) {
      logger.error('Error generating UI suggestions', { error });
      // Non-critical step, return empty object on failure to not break the flow
      span.end({ level: "ERROR", statusMessage: String(error) });
      return {};
    }
  }
};
