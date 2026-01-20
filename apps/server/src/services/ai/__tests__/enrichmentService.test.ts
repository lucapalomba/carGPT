import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichmentService } from '../enrichmentService.js';
import { imageSearchService } from '../../imageSearchService.js';
import { ollamaService } from '../../ollamaService.js';

vi.mock('../../imageSearchService.js', () => ({
  imageSearchService: {
    searchMultipleCars: vi.fn().mockResolvedValue({})
  }
}));
vi.mock('../../ollamaService.js');

describe('enrichmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enrichCarsWithImages', () => {
    it('should handle errors and throw them', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (imageSearchService.searchMultipleCars as any).mockRejectedValue(new Error('Search failed'));
        
        await expect(enrichmentService.enrichCarsWithImages([{ make: 'Toyota', model: 'Corolla' } as any], mockTrace)).rejects.toThrow('Search failed');
    });
  });

  describe('filterImages', () => {
    it('should return empty array if no images provided', async () => {
        const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, [], {});
        expect(result).toEqual([]);
    });

    it('should fallback to first 3 images if vision verification fails', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.verifyImageContainsCar as any).mockRejectedValue(new Error('Vision error'));
        
        const images = [{ url: '1' }, { url: '2' }, { url: '3' }, { url: '4' }];
        const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
        
        expect(result).toHaveLength(3);
        expect(result).toEqual(images.slice(0, 3));
    });

    it('should correctly filter valid and invalid images', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.verifyImageContainsCar as any)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        
        const images = [{ url: 'valid' }, { url: 'invalid' }];
        const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
        
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('valid');
    });
  });
});
