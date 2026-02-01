import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService } from '../translationService.js';

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllamaStructured: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn() };
    translationService = new TranslationService(mockOllamaService, mockPromptService);
  });

  describe('translateResults', () => {
    it('should return original results if translation fails', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
      mockOllamaService.callOllamaStructured.mockRejectedValue(new Error('Translation error'));
      
      const results = { analysis: 'original', cars: [] };
      const result = await translationService.translateResults(results, 'it', mockTrace);
      
      expect(result).toEqual(results);
    });

    it('should handle missing analysis gracefully', async () => { // Renamed for clarity
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      mockOllamaService.callOllamaStructured.mockResolvedValue({});
      
      const results = { analysis: '', cars: [] }; // Provide an empty string
      const result = await translationService.translateResults(results, 'it', mockTrace);
      expect(result.analysis).toBe(''); // Expect it to remain an empty string
    });
  });

  describe('translateSingleCar', () => {
    it('should translate car successfully', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ make: 'Toyota', model: 'Corolla', year: 2020, description: 'descrizione' });
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result.description).toBe('descrizione');
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.year).toBe(2020);
    });

    it('should preserve pinned status', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020, pinned: true };
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ make: 'Toyota', model: 'Corolla', year: 2020 });
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result.pinned).toBe(true);
    });

    it('should return original car if validation fails', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ make: 'Honda', model: 'Corolla', year: 2020 }); // Wrong make
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result).toEqual(car);
    });

    it('should return original car if translation throws error', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockRejectedValue(new Error('Translation failed'));
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result).toEqual(car);
    });
  });

  describe('translateAnalysis', () => {
    it('should translate analysis successfully', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ analysis: 'Questa è l\'analisi tradotta' });
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe('Questa è l\'analisi tradotta');
    });

    it('should return original analysis if translation is too short', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockResolvedValue({ analysis: 'short' });
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe(analysis);
    });

    it('should return original analysis if translation throws error', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      mockPromptService.loadTemplate.mockReturnValue('template ${targetLanguage}');
      mockOllamaService.callOllamaStructured.mockRejectedValue(new Error('Translation failed'));
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe(analysis);
    });
  });

  describe('validateCarTranslation', () => {
    it('should return true if identity matches', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, description: 'translated' };
      expect(translationService.validateCarTranslation(original, translated as any)).toBe(true);
    });

    it('should return false if make changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Honda', model: 'Corolla', year: 2020 };
      expect(translationService.validateCarTranslation(original, translated as any)).toBe(false);
    });

    it('should return false if model changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Camry', year: 2020 };
      expect(translationService.validateCarTranslation(original, translated as any)).toBe(false);
    });

    it('should return false if year changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2021 };
      expect(translationService.validateCarTranslation(original, translated as any)).toBe(false);
    });

    it('should return false if translated is not an object', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      expect(translationService.validateCarTranslation(original, null as any)).toBe(false);
      expect(translationService.validateCarTranslation(original, undefined as any)).toBe(false);
      expect(translationService.validateCarTranslation(original, 'string' as any)).toBe(false);
    });

    it('should preserve percentage when changed', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020, percentage: 85 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, percentage: 90 };
      
      const result = translationService.validateCarTranslation(original, translated as any);
      expect(result).toBe(true);
      expect((translated as any).percentage).toBe(85); // Should be restored to original
    });

    it('should preserve precise_model when changed', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020, precise_model: '1.8L' };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, precise_model: '2.0L' };
      
      const result = translationService.validateCarTranslation(original, translated as any);
      expect(result).toBe(true);
      expect((translated as any).precise_model).toBe('1.8L'); // Should be restored to original
    });

    it('should preserve configuration when changed', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020, configuration: 'Sedan' };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, configuration: 'Hatchback' };
      
      const result = translationService.validateCarTranslation(original, translated as any);
      expect(result).toBe(true);
      expect((translated as any).configuration).toBe('Sedan'); // Should be restored to original
    });
  });
});
