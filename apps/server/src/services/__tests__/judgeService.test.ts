import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JudgeService } from '../judgeService.js';
import { SearchResponse } from '../ai/types.js';

describe('JudgeService', () => {
  let judgeService: JudgeService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllama: vi.fn() };
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
      const mockVerdict = '{"verdict": "Great match", "vote": 90}';

      mockPromptService.loadTemplate.mockReturnValue('{{requirements}} {{responseContext}}');
      mockOllamaService.callOllama.mockResolvedValue(mockVerdict);

      const result = await judgeService.evaluateResponse(requirements, mockResponse, language);

      expect(mockPromptService.loadTemplate).toHaveBeenCalledWith('judge.md');
      
      // Verify prompt construction
      expect(mockOllamaService.callOllama).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                role: 'user',
                content: expect.stringContaining(requirements)
            })
        ]),
        undefined,
        'judge_evaluation'
      );
      
      // Verify context inclusion
      expect(mockOllamaService.callOllama).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                role: 'user',
                content: expect.stringContaining('Toyota')
            })
        ]),
        undefined,
        'judge_evaluation'
      );

      expect(result).toBe(mockVerdict);
    });

    it('should handle evaluation errors gracefully', async () => {
      const requirements = 'cheap fast car';
      const mockResponse: SearchResponse = { cars: [] };
      const language = 'en';

      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllama.mockRejectedValue(new Error('Ollama failed'));

      // Should ensure console.error is called but not throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await judgeService.evaluateResponse(requirements, mockResponse, language);

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
