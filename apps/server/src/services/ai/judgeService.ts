import { injectable, inject } from 'inversify';
import { SERVICE_IDENTIFIERS, IOllamaService, IJudgeService, IPromptService } from '../../container/interfaces.js';
import { SearchResponse } from './types.js';

import { JudgeVerdictSchema } from '../../utils/schemas.js';

@injectable()
export class JudgeService implements IJudgeService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  async evaluateResponse(requirements: string, fullResponse: SearchResponse, language: string, trace?: any): Promise<any> {
    const template = this.promptService.loadTemplate('judge.md');
    
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
      const result: any = await this.ollamaService.callOllamaStructured(
        [
          { role: 'user', content: prompt },
          { role: 'system', content: jsonGuard }
        ],
        JudgeVerdictSchema,
        trace,
        'judge_evaluation'
      );

      // Add Langfuse score for numerical tracking (safe and additive)
      if (trace && typeof trace.score === 'function') {
        trace.score({
          name: 'judge-score',
          value: result.vote / 100,
          comment: result.verdict
        });
      }

      return result;
    } catch (error) {
      console.error('Judge evaluation failed:', error);
      // Fail gracefully - return null
      return null;
    }
  }
}
