import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentService } from '../intentService.js';

describe('IntentService', () => {
  let intentService: IntentService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllamaStructured: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn() };
    intentService = new IntentService(mockOllamaService, mockPromptService);
  });

  describe('determineSearchIntent', () => {
    it('should call Ollama and parse search intent', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
      const requirements = 'family car';
      const language = 'en';
      const mockResult = { intent: "search" };
      
      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllamaStructured.mockResolvedValue(mockResult);

      const result = await intentService.determineSearchIntent(requirements, language, mockTrace);

      expect(mockPromptService.loadTemplate).toHaveBeenCalledWith('search_intent.md');
      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
