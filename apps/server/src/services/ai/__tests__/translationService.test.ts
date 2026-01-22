import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translationService } from '../translationService.js';
import { ollamaService } from '../../ollamaService.js';
import { promptService } from '../../promptService.js';

vi.mock('../../ollamaService.js');
vi.mock('../../promptService.js');

describe('translationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('translateResults', () => {
    it('should return original results if translation fails', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), update: vi.fn(), id: '1' }) };
      (ollamaService.callOllama as any).mockRejectedValue(new Error('Translation error'));
      
      const results = { analysis: 'original', cars: [] };
      const result = await translationService.translateResults(results, 'it', mockTrace);
      
      expect(result).toEqual(results);
    });

    it('should skip analysis translation if missing', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      (ollamaService.callOllama as any).mockResolvedValue('{}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({});
      
      const results = { cars: [] };
      const result = await translationService.translateResults(results, 'it', mockTrace);
      expect(result.analysis).toBeUndefined();
    });






  });

  describe('translateSingleCar', () => {
    it('should translate car successfully', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockResolvedValue('{"make": "Toyota", "model": "Corolla", "year": 2020, "description": "descrizione"}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({ make: 'Toyota', model: 'Corolla', year: 2020, description: 'descrizione' });
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result.description).toBe('descrizione');
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.year).toBe(2020);
    });

    it('should preserve pinned status', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020, pinned: true };
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockResolvedValue('{"make": "Toyota", "model": "Corolla", "year": 2020}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({ make: 'Toyota', model: 'Corolla', year: 2020 });
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result.pinned).toBe(true);
    });

    it('should return original car if validation fails', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockResolvedValue('{"make": "Honda", "model": "Corolla", "year": 2020}'); // Wrong make
      (ollamaService.parseJsonResponse as any).mockReturnValue({ make: 'Honda', model: 'Corolla', year: 2020 });
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result).toEqual(car);
    });

    it('should return original car if translation throws error', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const car = { make: 'Toyota', model: 'Corolla', year: 2020 };
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockRejectedValue(new Error('Translation failed'));
      
      const result = await translationService.translateSingleCar(car, 'it', mockTrace, 0);
      
      expect(result).toEqual(car);
    });
  });

  describe('translateAnalysis', () => {
    it('should translate analysis successfully', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockResolvedValue('{"analysis": "Questa è l\'analisi tradotta"}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({ analysis: 'Questa è l\'analisi tradotta' });
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe('Questa è l\'analisi tradotta');
    });

    it('should return original analysis if translation is too short', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockResolvedValue('{"analysis": "short"}');
      (ollamaService.parseJsonResponse as any).mockReturnValue({ analysis: 'short' });
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe(analysis);
    });

    it('should return original analysis if translation throws error', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn(), id: '1' }) };
      const analysis = 'This is the original analysis';
      
      (promptService.loadTemplate as any).mockReturnValue('template ${targetLanguage}');
      (ollamaService.callOllama as any).mockRejectedValue(new Error('Translation failed'));
      
      const result = await translationService.translateAnalysis(analysis, 'it', mockTrace);
      
      expect(result).toBe(analysis);
    });
  });

  describe('validateCarTranslation', () => {
    it('should return true if identity matches', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, description: 'translated' };
      expect(translationService.validateCarTranslation(original, translated)).toBe(true);
    });

    it('should return false if make changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Honda', model: 'Corolla', year: 2020 };
      expect(translationService.validateCarTranslation(original, translated)).toBe(false);
    });

    it('should return false if model changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Camry', year: 2020 };
      expect(translationService.validateCarTranslation(original, translated)).toBe(false);
    });

    it('should return false if year changes', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020 };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2021 };
      expect(translationService.validateCarTranslation(original, translated)).toBe(false);
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
      
      const result = translationService.validateCarTranslation(original, translated);
      expect(result).toBe(true);
      expect(translated.percentage).toBe(85); // Should be restored to original
    });

    it('should preserve precise_model when changed', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020, precise_model: '1.8L' };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, precise_model: '2.0L' };
      
      const result = translationService.validateCarTranslation(original, translated);
      expect(result).toBe(true);
      expect(translated.precise_model).toBe('1.8L'); // Should be restored to original
    });

    it('should preserve configuration when changed', () => {
      const original = { make: 'Toyota', model: 'Corolla', year: 2020, configuration: 'Sedan' };
      const translated = { make: 'Toyota', model: 'Corolla', year: 2020, configuration: 'Hatchback' };
      
      const result = translationService.validateCarTranslation(original, translated);
      expect(result).toBe(true);
      expect(translated.configuration).toBe('Sedan'); // Should be restored to original
    });
  });
});
