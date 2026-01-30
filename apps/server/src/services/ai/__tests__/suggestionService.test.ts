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
  });
});
