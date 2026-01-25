import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentService } from '../enrichmentService.js';

describe('EnrichmentService', () => {
  let enrichmentService: EnrichmentService;
  let mockOllamaService: any;
  let mockImageSearchService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { verifyImageContainsCar: vi.fn() };
    mockImageSearchService = { searchMultipleCars: vi.fn() };
    enrichmentService = new EnrichmentService(mockOllamaService, mockImageSearchService);
  });

  describe('enrichCarsWithImages', () => {
    it('should enrich cars with images successfully', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [
        { make: 'Toyota', model: 'Corolla', year: 2020 },
        { make: 'Honda', model: 'Civic', year: 2021 }
      ];
      
      const mockImages = {
        'Toyota-Corolla': [
          { url: 'toyota1.jpg', thumbnail: 'toyota1_thumb.jpg', title: 'Toyota Corolla', source: 'example.com' },
          { url: 'toyota2.jpg', thumbnail: 'toyota2_thumb.jpg', title: 'Toyota Corolla Side', source: 'cars.com' }
        ],
        'Honda-Civic': [
          { url: 'honda1.jpg', thumbnail: 'honda1_thumb.jpg', title: 'Honda Civic', source: 'motors.com' }
        ]
      };
      
      mockImageSearchService.searchMultipleCars.mockResolvedValue(mockImages);
      mockOllamaService.verifyImageContainsCar.mockResolvedValue(true);
      
      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      
      expect(result).toHaveLength(2);
      expect(result[0].images).toEqual(mockImages['Toyota-Corolla']);
      expect(result[1].images).toEqual(mockImages['Honda-Civic']);
    });

    it('should handle empty cars array', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const result = await enrichmentService.enrichCarsWithImages([], mockTrace);
      expect(result).toEqual([]);
    });

    it('should handle cars without images', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];
      mockImageSearchService.searchMultipleCars.mockResolvedValue({});
      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      expect(result[0].images).toEqual([]);
    });
  });

  describe('filterImages', () => {
    it('should return empty array if no images provided', async () => {
      const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, [], {});
      expect(result).toEqual([]);
    });

    it('should fallback to first 3 images if vision verification fails', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      mockOllamaService.verifyImageContainsCar.mockRejectedValue(new Error('Vision error'));
      
      const images = [{ url: '1' }, { url: '2' }, { url: '3' }, { url: '4' }];
      const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images as any, mockTrace);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(images.slice(0, 3));
    });

    it('should correctly filter valid and invalid images', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      mockOllamaService.verifyImageContainsCar
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      const images = [{ url: 'valid' }, { url: 'invalid' }];
      const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images as any, mockTrace);
      
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('valid');
    });
  });
});
