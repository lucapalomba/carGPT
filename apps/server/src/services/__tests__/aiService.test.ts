import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../aiService.js';
import { intentService } from '../ai/intentService.js';
import { suggestionService } from '../ai/suggestionService.js';
import { elaborationService } from '../ai/elaborationService.js';
import { translationService } from '../ai/translationService.js';
import { enrichmentService } from '../ai/enrichmentService.js';
import { ollamaService } from '../ollamaService.js';

// Mock all sub-services
vi.mock('../ai/intentService.js');
vi.mock('../ai/suggestionService.js');
vi.mock('../ai/elaborationService.js');
vi.mock('../ai/translationService.js');
vi.mock('../ai/enrichmentService.js');
vi.mock('../ollamaService.js');

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCarsWithImages', () => {
    it('should coordinate the search process using sub-services', async () => {
      // Setup successful mocks
      const mockIntent = { intent: "search" };
      const mockSuggestions = { choices: [{ make: "Toyota", model: "Corolla", year: 2020 }], analysis: "Original analysis" };
      const mockElaborated = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100" }];
      const mockTranslated = { cars: mockElaborated, analysis: "Translated analysis" };
      const mockEnriched = [{ make: "Toyota", model: "Corolla", year: 2020, price: "100", images: [] }];

      (intentService.determineSearchIntent as any).mockResolvedValue(mockIntent);
      (suggestionService.getCarSuggestions as any).mockResolvedValue(mockSuggestions);
      (elaborationService.elaborateCars as any).mockResolvedValue(mockElaborated);
      (translationService.translateResults as any).mockResolvedValue(mockTranslated);
      (enrichmentService.enrichCarsWithImages as any).mockResolvedValue(mockEnriched);

      const result = await aiService.findCarsWithImages('I need a reliable car', 'en', 'session-123');

      expect(intentService.determineSearchIntent).toHaveBeenCalledWith('I need a reliable car', 'en', expect.anything());
      expect(suggestionService.getCarSuggestions).toHaveBeenCalledWith(mockIntent, 'I need a reliable car', '', expect.anything());
      expect(elaborationService.elaborateCars).toHaveBeenCalledWith(mockSuggestions.choices, mockIntent, expect.anything());
      expect(translationService.translateResults).toHaveBeenCalledWith({ analysis: mockSuggestions.analysis, cars: mockElaborated }, 'en', expect.anything());
      expect(enrichmentService.enrichCarsWithImages).toHaveBeenCalledWith(mockTranslated.cars, expect.anything());

      expect(result.cars).toHaveLength(1);
      expect(result.analysis).toBe('Translated analysis');
    });

    it('should propagate errors', async () => {
      (intentService.determineSearchIntent as any).mockRejectedValue(new Error('Intent failed'));
      await expect(aiService.findCarsWithImages('req', 'en', 'sess')).rejects.toThrow('Intent failed');
    });
  });

  describe('refineCarsWithImages', () => {
     it('should coordinate the refinement process', async () => {
        const mockIntent = { intent: "refine" };
        const mockSuggestions = { choices: [], pinned_cars: [] };
        const mockTranslated = { cars: [], analysis: "" };
        const mockEnriched = [];

        (intentService.determineSearchIntent as any).mockResolvedValue(mockIntent);
        (suggestionService.getCarSuggestions as any).mockResolvedValue(mockSuggestions);
        // elaborateCars gets empty list
        (elaborationService.elaborateCars as any).mockResolvedValue([]); 
        (translationService.translateResults as any).mockResolvedValue(mockTranslated);
        (enrichmentService.enrichCarsWithImages as any).mockResolvedValue(mockEnriched);

        const result = await aiService.refineCarsWithImages('feedback', 'en', 'sess', 'context', []);
        
        expect(intentService.determineSearchIntent).toHaveBeenCalled();
        expect(suggestionService.getCarSuggestions).toHaveBeenCalled();
        expect(result.cars).toEqual([]);
     });
  });
});
