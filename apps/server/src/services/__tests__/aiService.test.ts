import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../aiService.js';

// Mock langfuse
vi.mock('../../utils/langfuse.js', () => ({
  langfuse: {
    trace: vi.fn().mockReturnValue({
      update: vi.fn(),
      id: 'mock-trace-id'
    })
  }
}));

import { langfuse } from '../../utils/langfuse.js';

describe('AIService', () => {
  let aiService: AIService;
  let mockOllamaService: any;
  let mockIntentService: any;
  let mockSuggestionService: any;
  let mockElaborationService: any;
  let mockTranslationService: any;
  let mockEnrichmentService: any;
  let mockJudgeService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mocked instances
    mockOllamaService = { verifyOllama: vi.fn() };
    mockIntentService = { determineSearchIntent: vi.fn() };
    mockSuggestionService = { getCarSuggestions: vi.fn() };
    mockElaborationService = { elaborateCars: vi.fn() };
    mockTranslationService = { translateResults: vi.fn() };
    mockEnrichmentService = { enrichCarsWithImages: vi.fn() };
    mockJudgeService = { evaluateResponse: vi.fn() };

    aiService = new AIService(
      mockOllamaService,
      {} as any,
      mockIntentService,
      mockSuggestionService,
      mockElaborationService,
      mockTranslationService,
      mockEnrichmentService,
      mockJudgeService
    );
  });

  describe('findCarsWithImages', () => {
    it('should coordinate the search process using sub-services and update trace with judge results', async () => {
      // Setup successful mocks
      const mockIntent = { intent: "search" };
      const mockSuggestions = { choices: [{ make: "Toyota", model: "Corolla", year: 2020 }], analysis: "Original analysis" };
      const mockElaborated = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100" }];
      const mockTranslated = { cars: mockElaborated, analysis: "Translated analysis" };
      const mockEnriched = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100", images: [] }];
      const mockJudgeVerdict = { verdict: 'Perfect', vote: 100 };
      
      const mockTrace = { update: vi.fn(), id: 'trace-123' };
      vi.mocked(langfuse.trace).mockReturnValue(mockTrace as any);

      vi.mocked(mockOllamaService.verifyOllama).mockResolvedValue(true);
      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue(mockIntent);
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue(mockSuggestions);
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue(mockElaborated);
      vi.mocked(mockTranslationService.translateResults).mockResolvedValue(mockTranslated as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockResolvedValue(mockEnriched as any);
      vi.mocked(mockJudgeService.evaluateResponse).mockResolvedValue(mockJudgeVerdict);

      const result = await aiService.findCarsWithImages('I need a reliable car', 'en', 'session-123');

      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledWith('I need a reliable car', 'en', mockTrace);
      expect(mockJudgeService.evaluateResponse).toHaveBeenCalledWith('I need a reliable car', expect.anything(), 'en', mockTrace);
      
      // Verify trace update with judge results
      expect(mockTrace.update).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          judgeVerdict: 'Perfect',
          judgeScore: 100
        }),
        tags: ['JUDGE_PASSED']
      }));

      expect(result.cars).toHaveLength(1);
    });

    it('should propagate errors', async () => {
      vi.mocked(mockOllamaService.verifyOllama).mockResolvedValue(true);
      vi.mocked(mockIntentService.determineSearchIntent).mockRejectedValue(new Error('Intent failed'));
      await expect(aiService.findCarsWithImages('req', 'en', 'sess')).rejects.toThrow('Intent failed');
    });
  });

  describe('refineCarsWithImages', () => {
    it('should coordinate the refinement process with empty pinned cars', async () => {
      const mockIntent = { intent: "refine" };
      const mockSuggestions = { choices: [], analysis: "Refine analysis" };
      const mockTranslated = { cars: [], analysis: "Translated refine" };
      const mockEnriched: any[] = [];

      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue(mockIntent);
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue(mockSuggestions);
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue([]); 
      vi.mocked(mockTranslationService.translateResults).mockResolvedValue(mockTranslated as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockResolvedValue(mockEnriched as any);

      const result = await aiService.refineCarsWithImages('feedback', 'en', 'sess', 'context', []);
      
      const expectedRefinementContext = [
        '# REFINEMENT CONTEXT',
        'context',
        '',
        '# LATEST FEEDBACK',
        'feedback'
      ].join('\n');

      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledWith(expectedRefinementContext, 'en', expect.anything());
      expect(mockSuggestionService.getCarSuggestions).toHaveBeenCalledWith(
        mockIntent, 
        expectedRefinementContext, 
        '', 
        expect.anything()
      );
      expect(result.cars).toEqual([]);
      expect(result.searchIntent).toEqual(mockIntent);
      expect(result.suggestions).toEqual(mockSuggestions);
    });

    it('should coordinate the refinement process with pinned cars', async () => {
      const mockIntent = { intent: "refine" };
      const pinnedCars = [{ make: "Tesla", model: "Model 3", year: 2022 }];
      const mockSuggestions = { choices: [{ make: "BMW", model: "i3", year: 2021 }], analysis: "New suggestions" };
      const mockElaborated = [
        { make: "Tesla", model: "Model 3", year: 2022, pinned: true, price: "40k" },
        { make: "BMW", model: "i3", year: 2021, price: "35k" }
      ];
      const mockTranslated = { cars: mockElaborated, analysis: "Translated suggestions" };

      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue(mockIntent);
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue(mockSuggestions);
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue(mockElaborated);
      vi.mocked(mockTranslationService.translateResults).mockResolvedValue(mockTranslated as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockResolvedValue(mockElaborated as any);

      const result = await aiService.refineCarsWithImages('electric only', 'en', 'sess', 'context', pinnedCars as any);
      
      const expectedRefinementContext = [
        '# REFINEMENT CONTEXT',
        'context',
        '',
        '# LATEST FEEDBACK',
        'electric only'
      ].join('\n');

      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledWith(expectedRefinementContext, 'en', expect.anything());
      expect(mockSuggestionService.getCarSuggestions).toHaveBeenCalledWith(
        mockIntent, 
        expectedRefinementContext, 
        expect.stringContaining('Tesla Model 3 (2022)'), 
        expect.anything()
      );
      
      expect(mockElaborationService.elaborateCars).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ make: "Tesla", pinned: true }),
          expect.objectContaining({ make: "BMW" })
        ]),
        mockIntent,
        expect.anything()
      );
      
      expect(result.cars).toHaveLength(2);
      expect(result.cars[0].pinned).toBe(true);
      expect(result.searchIntent).toEqual(mockIntent);
      expect(result.suggestions).toEqual(mockSuggestions);
    });

    it('should propagate errors in refinement', async () => {
      vi.mocked(mockIntentService.determineSearchIntent).mockRejectedValue(new Error('Refine error'));
      await expect(aiService.refineCarsWithImages('feedback', 'en', 'sess', 'ctx')).rejects.toThrow('Refine error');
    });
  });

  describe('retry logic', () => {
    it('should succeed if a step fails once but succeeds on retry', async () => {
      const mockIntent = { intent: "search" };
      
      // First call fails, second succeeds
      vi.mocked(mockIntentService.determineSearchIntent)
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(mockIntent);
      
      // Mock other services to succeed
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue({ choices: [], analysis: "" });
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue([]);
      vi.mocked(mockTranslationService.translateResults).mockResolvedValue({ cars: [], analysis: "" } as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockResolvedValue([] as any);

      const result = await aiService.findCarsWithImages('req', 'en', 'sess');
      
      expect(result.success).toBe(true);
      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      vi.mocked(mockIntentService.determineSearchIntent).mockRejectedValue(new Error('Permanent error'));
      
      // Default retry count is 2, so 3 attempts total
      await expect(aiService.findCarsWithImages('req', 'en', 'sess')).rejects.toThrow('Permanent error');
      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledTimes(3);
    });
  });

  describe('public helpers', () => {
    it('verify delegates to the ollama service', async () => {
      vi.mocked(mockOllamaService.verifyOllama).mockResolvedValue(true);
      await expect(aiService.verify()).resolves.toBe(true);
      expect(mockOllamaService.verifyOllama).toHaveBeenCalled();
    });

    it('clearCache and getCacheStats delegate to the cache service', () => {
      const cache = {
        clear: vi.fn(),
        getCacheStats: vi.fn().mockReturnValue({ size: 3, keys: ['a', 'b', 'c'] })
      };
      const service = new AIService(
        mockOllamaService,
        cache as any,
        mockIntentService,
        mockSuggestionService,
        mockElaborationService,
        mockTranslationService,
        mockEnrichmentService,
        mockJudgeService
      );

      service.clearCache();
      expect(cache.clear).toHaveBeenCalled();

      expect(service.getCacheStats()).toEqual({ size: 3, keys: ['a', 'b', 'c'] });
    });

    it('continues when the judge evaluation throws', async () => {
      const cars = [{ make: 'Fiat', model: 'Panda', year: 2020, price: '10000' }];
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue({ constraints: {} });
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue({ choices: [], analysis: 'a' });
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue(cars);
      vi.mocked(mockTranslationService.translateResults).mockImplementation(async (input: any) => input as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockImplementation(async (c: any) => c);
      vi.mocked(mockJudgeService.evaluateResponse).mockRejectedValue(new Error('judge down'));

      const result = await aiService.findCarsWithImages('req', 'en', 'sess');

      expect(result.success).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('budget enforcement', () => {
    const setupHappyPath = (searchIntent: any, elaborated: any[]) => {
      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue(searchIntent);
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue({ choices: [], analysis: 'a' });
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue(elaborated);
      // Echo back whatever the budget filter forwarded to the translator
      vi.mocked(mockTranslationService.translateResults).mockImplementation(
        async (input: any) => ({ cars: input.cars, analysis: input.analysis }) as any
      );
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockImplementation(async (cars: any) => cars);
      vi.mocked(mockJudgeService.evaluateResponse).mockResolvedValue({ verdict: 'ok', vote: 80 });
    };

    it('excludes cars above the parsed budget and keeps unpriced cars', async () => {
      const expensive = { make: 'Porsche', model: '911', year: 2023, price: '120000' };
      const affordable = { make: 'Fiat', model: 'Panda', year: 2020, price: '12000' };
      const unknown = { make: 'Old', model: 'Timer', year: 1970 };
      setupHappyPath(
        { constraints: { budget: '30000' } },
        [expensive, affordable, unknown]
      );

      const result = await aiService.findCarsWithImages('req', 'en', 'sess');

      expect(result.cars).toHaveLength(2);
      expect(result.cars.map(c => c.make)).toEqual(expect.arrayContaining(['Fiat', 'Old']));
      expect(result.cars.map(c => c.make)).not.toContain('Porsche');
    });

    it('keeps every car when no budget is expressed', async () => {
      const cars = [
        { make: 'A', model: 'X', year: 2020, price: '10000' },
        { make: 'B', model: 'Y', year: 2021, price: '90000' }
      ];
      setupHappyPath({ constraints: {} }, cars);

      const result = await aiService.findCarsWithImages('req', 'en', 'sess');

      expect(result.cars).toHaveLength(2);
    });

    it('preserves pinned cars even when they exceed the budget during refinement', async () => {
      const pinned = { make: 'Porsche', model: '911', year: 2023, price: '150000', pinned: true };
      const overBudget = { make: 'Jaguar', model: 'F-Type', year: 2022, price: '90000' };
      const withinBudget = { make: 'Fiat', model: 'Panda', year: 2020, price: '12000' };

      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue({ constraints: { budget: '30000' } });
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue({ choices: [], analysis: 'a' });
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue([pinned, overBudget, withinBudget]);
      vi.mocked(mockTranslationService.translateResults).mockImplementation(
        async (input: any) => ({ cars: input.cars, analysis: input.analysis }) as any
      );
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockImplementation(async (c: any) => c);
      vi.mocked(mockJudgeService.evaluateResponse).mockResolvedValue({ verdict: 'ok', vote: 80 });

      const result = await aiService.refineCarsWithImages('feedback', 'en', 'sess', 'ctx', [pinned] as any);

      const makes = result.cars.map(c => c.make);
      expect(makes).toContain('Porsche'); // pinned preserved despite over-budget
      expect(makes).toContain('Fiat');
      expect(makes).not.toContain('Jaguar');
    });
  });
});
