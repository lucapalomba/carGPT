import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuggestionService } from '../suggestionService.js';

describe('SuggestionService', () => {
  let suggestionService: SuggestionService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllamaStructured: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn() };
    suggestionService = new SuggestionService(mockOllamaService, mockPromptService);
  });

  describe('getCarSuggestions', () => {
    it('should call Ollama and return suggestions', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
      const searchIntent = { intent: "search" };
      const requirements = "family car";
      const mockResult = { choices: [] };

      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllamaStructured.mockResolvedValue(mockResult);

      const result = await suggestionService.getCarSuggestions(searchIntent, requirements, '', mockTrace);

      expect(mockPromptService.loadTemplate).toHaveBeenCalledWith('cars_suggestions.md');
      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('includes the pinned cars prompt when provided', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ choices: [] });

      await suggestionService.getCarSuggestions({ intent: 'search' }, 'family car', 'PINNED CARS HINT', mockTrace);

      const messages = mockOllamaService.callOllamaStructured.mock.calls[0][0];
      expect(messages).toEqual(
        expect.arrayContaining([expect.objectContaining({ content: 'PINNED CARS HINT' })])
      );
    });

    it('ends the span with an error and rethrows when Ollama fails', async () => {
      const spanEnd = vi.fn();
      const mockTrace = { span: vi.fn().mockReturnValue({ end: spanEnd, id: '1' }) };
      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllamaStructured.mockRejectedValue(new Error('ollama down'));

      await expect(
        suggestionService.getCarSuggestions({ intent: 'search' }, 'family car', '', mockTrace)
      ).rejects.toThrow('ollama down');

      expect(spanEnd).toHaveBeenCalledWith(expect.objectContaining({ level: 'ERROR' }));
    });
  });
});
