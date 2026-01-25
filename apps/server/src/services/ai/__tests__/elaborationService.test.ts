import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElaborationService } from '../elaborationService.js';

describe('ElaborationService', () => {
  let elaborationService: ElaborationService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllama: vi.fn(), parseJsonResponse: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn() };
    elaborationService = new ElaborationService(mockOllamaService, mockPromptService);
  });

  describe('elaborateCars', () => {
    it('should elaborate a list of car choices', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
      const carChoices = [{ make: "Toyota", model: "Corolla" }];
      const searchIntent = {};
      const mockResult = { description: "elaborated" };

      mockPromptService.loadTemplate.mockReturnValue('template');
      mockOllamaService.callOllama.mockResolvedValue('{}');
      mockOllamaService.parseJsonResponse.mockReturnValue(mockResult);

      const result = await elaborationService.elaborateCars(carChoices, searchIntent, mockTrace);

      expect(result[0].description).toBe("elaborated");
      expect(mockOllamaService.callOllama).toHaveBeenCalled();
    });
  });
});
