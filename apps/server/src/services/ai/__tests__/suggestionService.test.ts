import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuggestionService } from '../suggestionService.js';

describe('SuggestionService', () => {
  let suggestionService: SuggestionService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllama: vi.fn(), parseJsonResponse: vi.fn() };
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
      mockOllamaService.callOllama.mockResolvedValue('{"choices": []}');
      mockOllamaService.parseJsonResponse.mockReturnValue(mockResult);

      const result = await suggestionService.getCarSuggestions(searchIntent, requirements, '', mockTrace);

      expect(mockPromptService.loadTemplate).toHaveBeenCalledWith('cars_suggestions.md');
      expect(mockOllamaService.callOllama).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
