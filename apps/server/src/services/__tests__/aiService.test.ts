import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../aiService.js';


describe('AIService', () => {
  let aiService: AIService;
  let mockOllamaService: any;
  let mockIntentService: any;
  let mockSuggestionService: any;
  let mockElaborationService: any;
  let mockTranslationService: any;
  let mockEnrichmentService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mocked instances
    mockOllamaService = { verifyOllama: vi.fn() };
    mockIntentService = { determineSearchIntent: vi.fn() };
    mockSuggestionService = { getCarSuggestions: vi.fn() };
    mockElaborationService = { elaborateCars: vi.fn() };
    mockTranslationService = { translateResults: vi.fn() };
    mockEnrichmentService = { enrichCarsWithImages: vi.fn() };

    aiService = new AIService(
      mockOllamaService,
      {} as any,
      mockIntentService,
      mockSuggestionService,
      mockElaborationService,
      mockTranslationService,
      mockEnrichmentService
    );
  });

  describe('findCarsWithImages', () => {
    it('should coordinate the search process using sub-services', async () => {
      // Setup successful mocks
      const mockIntent = { intent: "search" };
      const mockSuggestions = { choices: [{ make: "Toyota", model: "Corolla", year: 2020 }], analysis: "Original analysis" };
      const mockElaborated = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100" }];
      const mockTranslated = { cars: mockElaborated, analysis: "Translated analysis" };
      const mockEnriched = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100", images: [] }];

      vi.mocked(mockOllamaService.verifyOllama).mockResolvedValue(true);
      vi.mocked(mockIntentService.determineSearchIntent).mockResolvedValue(mockIntent);
      vi.mocked(mockSuggestionService.getCarSuggestions).mockResolvedValue(mockSuggestions);
      vi.mocked(mockElaborationService.elaborateCars).mockResolvedValue(mockElaborated);
      vi.mocked(mockTranslationService.translateResults).mockResolvedValue(mockTranslated as any);
      vi.mocked(mockEnrichmentService.enrichCarsWithImages).mockResolvedValue(mockEnriched as any);

      const result = await aiService.findCarsWithImages('I need a reliable car', 'en', 'session-123');

      expect(mockIntentService.determineSearchIntent).toHaveBeenCalledWith('I need a reliable car', 'en', expect.anything());
      expect(mockSuggestionService.getCarSuggestions).toHaveBeenCalledWith(mockIntent, 'I need a reliable car', '', expect.anything());
      expect(mockElaborationService.elaborateCars).toHaveBeenCalledWith(mockSuggestions.choices, mockIntent, expect.anything());
      expect(mockTranslationService.translateResults).toHaveBeenCalledWith({ analysis: mockSuggestions.analysis, cars: mockElaborated }, 'en', expect.anything());
      expect(mockEnrichmentService.enrichCarsWithImages).toHaveBeenCalledWith(mockTranslated.cars, expect.anything());

      expect(result.cars).toHaveLength(1);
      expect(result.analysis).toBe('Translated analysis');
      expect(result.searchIntent).toEqual(mockIntent);
      expect(result.suggestions).toEqual(mockSuggestions);
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
      
      expect(mockIntentService.determineSearchIntent).toHaveBeenCalled();
      expect(mockSuggestionService.getCarSuggestions).toHaveBeenCalledWith(mockIntent, 'feedback', 'context', expect.anything());
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
      
      expect(mockSuggestionService.getCarSuggestions).toHaveBeenCalledWith(
        mockIntent, 
        'electric only', 
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
});
