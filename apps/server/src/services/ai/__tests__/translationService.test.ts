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
  });
});
