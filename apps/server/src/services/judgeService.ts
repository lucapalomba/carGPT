
import { injectable, inject } from 'inversify';
import { SERVICE_IDENTIFIERS, IOllamaService, IJudgeService, IPromptService } from '../container/interfaces.js';
import { SearchResponse } from './ai/types.js';

import { JudgeVerdictSchema } from '../utils/schemas.js';

@injectable()
export class JudgeService implements IJudgeService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  async evaluateResponse(requirements: string, fullResponse: SearchResponse, language: string, trace?: any): Promise<string> {
    const template = this.promptService.loadTemplate('judge.md');
    
    // Create a simplified version of the response context to avoid hitting token limits if the response is huge
    // We strictly follow the user request to provide the "complete response", but we might need to be careful with images arrays which can be verbose.
    // However, the prompt asks for "System Response (Analysis + Cars)".
    // Let's pass the full response but maybe strip out base64 images if they existed (they are URLs here so it is fine).
    
    const filteredResponse = {
      analysis: fullResponse.analysis,
      cars: fullResponse.cars
    };
    
    const context = JSON.stringify(filteredResponse, null, 2);
    
    const prompt = template
      .replace('{{requirements}}', requirements)
      .replace('{{responseContext}}', context);

    const jsonGuard = this.promptService.loadTemplate('json-guard.md');

    try {
      const result = await this.ollamaService.callOllamaStructured(
        [
          { role: 'user', content: prompt },
          { role: 'system', content: jsonGuard }
        ],
        JudgeVerdictSchema,
        "Judge evaluation returning a verdict and score",
        trace,
        'judge_evaluation'
      );

      return JSON.stringify(result);
    } catch (error) {
      console.error('Judge evaluation failed:', error);
      // Fail gracefully - return empty string or a fallback
      return "";
    }
  }
}
