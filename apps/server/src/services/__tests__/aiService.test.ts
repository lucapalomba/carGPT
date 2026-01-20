import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../aiService.js';
import { ollamaService } from '../ollamaService.js';
import { promptService } from '../promptService.js';
import { imageSearchService } from '../imageSearchService.js';

vi.mock('../ollamaService.js');
vi.mock('../promptService.js');
vi.mock('../imageSearchService.js', () => ({
  imageSearchService: {
    searchMultipleCars: vi.fn().mockResolvedValue({})
  }
}));

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
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ 
        car: { 
          percentage: 90,
          vehicle_properties: {
             trunk: { translatedLabel: "Trunk", value: "Large" }
          },
          constraints_satisfaction: {
             budget: "100, ok"
          }
        } 
      });

      // Mock translation
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"analysis": "translated analysis"}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ analysis: "translated analysis" });
      
      (ollamaService.callOllama as any).mockResolvedValueOnce('{"make": "Toyota", "model": "Corolla", "year": 2020}');
      (ollamaService.parseJsonResponse as any).mockReturnValueOnce({ make: "Toyota", model: "Corolla", year: 2020 });

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

      const result = await aiService.refineCarsWithImages('More power', 'en', 'session-123', 'context', []);
      expect(result.cars).toBeDefined();
    });

    it('should include pinned cars in prompt if provided', async () => {
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockResolvedValue('{"choices": []}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({ choices: [] });

        await aiService.refineCarsWithImages('More power', 'en', 'session-123', 'context', [{ make: 'Tesla', model: '3', year: 2022 }]);
        expect(ollamaService.callOllama).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ content: expect.stringContaining('Tesla 3 (2022)') })
            ]),
            expect.any(Object),
            'car_suggestions'
        );
    });

    it('should handle errors and log them', async () => {
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Refine error'));
        await expect(aiService.refineCarsWithImages('More power', 'en', 'session-123', 'context', [])).rejects.toThrow('Refine error');
    });
  });

  describe('determineSearchIntent', () => {
    it('should throw error if determination fails', async () => {
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Intent error'));
        await expect(aiService.determineSearchIntent('context', 'en', { span: vi.fn().mockReturnValue({ end: vi.fn() }) })).rejects.toThrow('Intent error');
    });
  });

  describe('getCarSuggestions', () => {
    it('should throw error if suggestion fails', async () => {
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Suggestion error'));
        await expect(aiService.getCarSuggestions({}, 'context', '', { span: vi.fn().mockReturnValue({ end: vi.fn() }) })).rejects.toThrow('Suggestion error');
    });
  });

  describe('elaborateCars', () => {
    it('should fallback to original car if individual elaboration fails', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Elaboration error'));
        
        const cars = [{ make: 'Toyota', model: 'Camry' }];
        const result = await aiService.elaborateCars(cars, {}, mockTrace);
        
        expect(result[0]).toEqual(cars[0]);
    });
  });

  describe('translateResults', () => {
    it('should return original results if translation fails', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Translation error'));
        
        const results = { analysis: 'original', cars: [] };
        const result = await aiService.translateResults(results, 'it', mockTrace);
        
        expect(result).toEqual(results);
    });

    it('should skip analysis translation if missing', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
        (ollamaService.callOllama as any).mockResolvedValue('{}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({});
        
        const results = { cars: [] };
        const result = await aiService.translateResults(results, 'it', mockTrace);
        expect(result.analysis).toBeUndefined();
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

  describe('enrichCarsWithImages', () => {
    it('should handle errors and throw them', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (imageSearchService.searchMultipleCars as any).mockRejectedValue(new Error('Search failed'));
        
        await expect(aiService.enrichCarsWithImages([{ make: 'Toyota', model: 'Corolla' } as any], mockTrace)).rejects.toThrow('Search failed');
    });
  });

  describe('filterImages', () => {
    it('should return empty array if no images provided', async () => {
        const result = await aiService.filterImages('Toyota', 'Corolla', 2020, [], {});
        expect(result).toEqual([]);
    });

    it('should fallback to first 3 images if vision verification fails', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.verifyImageContainsCar as any).mockRejectedValue(new Error('Vision error'));
        
        const images = [{ url: '1' }, { url: '2' }, { url: '3' }, { url: '4' }];
        const result = await aiService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
        
        expect(result).toHaveLength(3);
        expect(result).toEqual(images.slice(0, 3));
    });

    it('should correctly filter valid and invalid images', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.verifyImageContainsCar as any)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        
        const images = [{ url: 'valid' }, { url: 'invalid' }];
        const result = await aiService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
        
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('valid');
    });
  });
});
