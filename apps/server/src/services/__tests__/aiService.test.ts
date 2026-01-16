import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../aiService.js';
import { ollamaService } from '../ollamaService.js';
import { imageSearchService } from '../imageSearchService.js';
import { promptService } from '../promptService.js';

vi.mock('../ollamaService.js');
vi.mock('../imageSearchService.js');
vi.mock('../promptService.js');

const mockTrace = {
  span: vi.fn().mockReturnValue({
    end: vi.fn(),
    id: 'span-123'
  }),
  id: 'trace-123'
};

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCarsWithImages', () => {
    it('should coordinate the search process', async () => {
      // Mock prompt templates
      (promptService.loadTemplate as any).mockReturnValue('${userLanguage}');

      // Mock intent
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"intent": "search"}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ intent: "search" });

      // Mock suggestions
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"choices": [{"make": "Toyota", "model": "Corolla"}]}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ choices: [{ make: "Toyota", model: "Corolla", year: 2020 }] });

      // Mock elaboration
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"car": {"percentage": 90}}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ car: { percentage: 90 } });

      // Mock translation
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"analysis": "translated analysis"}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ analysis: "translated analysis" });
      
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"make": "Toyota", "model": "Corolla", "year": 2020}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ make: "Toyota", model: "Corolla", year: 2020 });

      // Mock image search
      (imageSearchService.searchMultipleCars as any).mockResolvedValue({
        'Toyota-Corolla': [{ url: 'http://img.jpg' }]
      });

      // Mock image filtering (callOllama for verification)
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"isMatch": true}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ isMatch: true });

      const result = await aiService.findCarsWithImages('I need a reliable car', 'en', 'session-123');

      expect(result.cars).toHaveLength(1);
      expect(result.cars[0].make).toBe('Toyota');
      expect(ollamaService.callOllama).toHaveBeenCalled();
    });
  });

  describe('refineCarsWithImages', () => {
    it('should coordinate the refinement process', async () => {
      (promptService.loadTemplate as any).mockReturnValue('template');
      (ollamaService.callOllama as any).mockResolvedValue('{"choices": []}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({ choices: [] });
      (imageSearchService.searchMultipleCars as any).mockResolvedValue({});

      const result = await aiService.refineCarsWithImages('More power', 'en', 'session-123', 'context', []);
      expect(result.cars).toBeDefined();
    });
  });

  describe('enrichCarsWithImages', () => {
      it('should search and verify images', async () => {
          const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];
          (imageSearchService.searchMultipleCars as any).mockResolvedValue({
              'Toyota-Corolla': [{ url: 'http://img.jpg' }]
          });
          (ollamaService.verifyImageContainsCar as any).mockResolvedValue(true);

          const results = await aiService.enrichCarsWithImages(cars, mockTrace);
          expect(results[0].images).toHaveLength(1);
      });

      it('should handle missing images and fallback', async () => {
        const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];
        (imageSearchService.searchMultipleCars as any).mockResolvedValue({});
        
        const results = await aiService.enrichCarsWithImages(cars, mockTrace);
        expect(results[0].images).toEqual([]);
      });
  });

  describe('validateCarTranslation', () => {
    it('should return true if identity matches', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, description: 'translated' };
      expect(aiService.validateCarTranslation(original, translated)).toBe(true);
    });

    it('should return false if make changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Honda', model: 'Corolla', year: 2020 };
      expect(aiService.validateCarTranslation(original, translated)).toBe(false);
    });
  });
});
