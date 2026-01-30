import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JudgeService } from '../judgeService.js';
import { SearchResponse } from '../ai/types.js';
import { JudgeVerdictSchema } from '../../utils/schemas.js';

describe('JudgeService', () => {
  let judgeService: JudgeService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllamaStructured: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn() };
    judgeService = new JudgeService(mockOllamaService, mockPromptService);
  });

  describe('evaluateResponse', () => {
    it('should evaluate response successfully', async () => {
      const requirements = 'cheap fast car';
      const mockResponse: SearchResponse = {
        cars: [{ make: 'Toyota', model: 'Corolla', year: 2020 }],
        analysis: 'Good car'
      };
      const language = 'en';
      const mockVerdict = { verdict: 'Great match', vote: 90 };

      mockPromptService.loadTemplate.mockReturnValue('{{requirements}} {{responseContext}}');
      mockOllamaService.callOllamaStructured.mockResolvedValue(mockVerdict);

      const result = await judgeService.evaluateResponse(requirements, mockResponse, language);

      expect(mockPromptService.loadTemplate).toHaveBeenCalledWith('judge.md');
      
      // Verify prompt construction and context inclusion
      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                role: 'user',
                content: expect.stringContaining(requirements && 'Toyota')
            })
        ]),
        JudgeVerdictSchema,
        "Judge evaluation returning a verdict and score",
        undefined,
        'judge_evaluation'
      );

      expect(result).toBe(JSON.stringify(mockVerdict));
    });

    it('should handle evaluation errors gracefully', async () => {
      const requirements = 'cheap fast car';
      const mockResponse: SearchResponse = { cars: [] };
      const language = 'en';

      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllamaStructured.mockRejectedValue(new Error('Ollama failed'));

      // Should ensure console.error is called but not throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await judgeService.evaluateResponse(requirements, mockResponse, language);

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
