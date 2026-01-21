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
      
      (imageSearchService.searchMultipleCars as any).mockResolvedValue(mockImages);
      
      // Mock successful image verification
      (ollamaService.verifyImageContainsCar as any).mockResolvedValue(true);
      
      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...cars[0],
        images: mockImages['Toyota-Corolla']
      });
      expect(result[1]).toEqual({
        ...cars[1],
        images: mockImages['Honda-Civic']
      });
    });

    it('should handle empty cars array', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      
      const result = await enrichmentService.enrichCarsWithImages([], mockTrace);
      
      expect(result).toEqual([]);
      expect(imageSearchService.searchMultipleCars).not.toHaveBeenCalled();
    });

    it('should handle cars without images', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];
      
      (imageSearchService.searchMultipleCars as any).mockResolvedValue({});
      
      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      
      expect(result[0].images).toEqual([]);
    });

    it('should handle errors and throw them', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      (imageSearchService.searchMultipleCars as any).mockRejectedValue(new Error('Search failed'));
      
      await expect(enrichmentService.enrichCarsWithImages([{ make: 'Toyota', model: 'Corolla' } as any], mockTrace)).rejects.toThrow('Search failed');
    });

    it('should handle null/undefined cars array', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      
      const result1 = await enrichmentService.enrichCarsWithImages(null as any, mockTrace);
      const result2 = await enrichmentService.enrichCarsWithImages(undefined as any, mockTrace);
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should enrich cars with verified images only', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];
      
      const mockImages = {
        'Toyota-Corolla': [
          { url: 'valid.jpg', thumbnail: 'valid_thumb.jpg', title: 'Valid', source: 'example.com' },
          { url: 'invalid.jpg', thumbnail: 'invalid_thumb.jpg', title: 'Invalid', source: 'cars.com' }
        ]
      };
      
      (imageSearchService.searchMultipleCars as any).mockResolvedValue(mockImages);
      
      // Mock image verification - only first image is valid
      (ollamaService.verifyImageContainsCar as any)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      
      expect(result[0].images).toHaveLength(1);
      expect(result[0]?.images?.[0]?.url).toBe('valid.jpg');
    });

    it('should use correct car key format', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [
        { make: 'BMW', model: 'M3', year: 2020 },
        { make: 'Mercedes-Benz', model: 'C-Class', year: 2021 }
      ];
      
      const mockImages = {
        'BMW-M3': [{ url: 'bmw.jpg', thumbnail: 'bmw_thumb.jpg', title: 'BMW M3', source: 'bmw.com' }],
        'Mercedes-Benz-C-Class': [{ url: 'mercedes.jpg', thumbnail: 'mercedes_thumb.jpg', title: 'Mercedes C-Class', source: 'mercedes.com' }]
      };
      
      (imageSearchService.searchMultipleCars as any).mockResolvedValue(mockImages);
      (ollamaService.verifyImageContainsCar as any).mockResolvedValue(true);
      
      await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);
      
      expect(imageSearchService.searchMultipleCars).toHaveBeenCalledWith([
        { make: 'BMW', model: 'M3', year: '2020' },
        { make: 'Mercedes-Benz', model: 'C-Class', year: '2021' }
      ]);
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

    it('should handle images with thumbnail preference', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      (ollamaService.verifyImageContainsCar as any).mockResolvedValue(true);
      
      const images = [
        { url: 'direct.jpg', thumbnail: 'thumb.jpg' },
        { url: 'only_direct.jpg' } // no thumbnail
      ];
      
      await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
      
      // Should verify using thumbnail when available
      expect(ollamaService.verifyImageContainsCar).toHaveBeenCalledWith('Toyota Corolla', 2020, 'thumb.jpg', mockTrace);
      expect(ollamaService.verifyImageContainsCar).toHaveBeenCalledWith('Toyota Corolla', 2020, 'only_direct.jpg', mockTrace);
    });



    it('should handle string and number years correctly', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      (ollamaService.verifyImageContainsCar as any).mockResolvedValue(true);
      
      const images = [{ url: 'test.jpg' }];
      
      await enrichmentService.filterImages('Toyota', 'Corolla', '2020', images, mockTrace);
      expect(ollamaService.verifyImageContainsCar).toHaveBeenCalledWith('Toyota Corolla', '2020', 'test.jpg', mockTrace);
      
      await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
      expect(ollamaService.verifyImageContainsCar).toHaveBeenCalledWith('Toyota Corolla', 2020, 'test.jpg', mockTrace);
    });

    it('should handle all images failing verification', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      (ollamaService.verifyImageContainsCar as any).mockResolvedValue(false);
      
      const images = [{ url: '1' }, { url: '2' }];
      const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
      
      expect(result).toEqual([]);
    });

    it('should handle verification returning non-boolean values', async () => {
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      (ollamaService.verifyImageContainsCar as any)
        .mockResolvedValueOnce('true' as any) // string 'true'
        .mockResolvedValueOnce(1 as any)     // number 1
        .mockResolvedValueOnce({}) as any;   // object
      
      const images = [{ url: '1' }, { url: '2' }, { url: '3' }];
      const result = await enrichmentService.filterImages('Toyota', 'Corolla', 2020, images, mockTrace);
      
      expect(result).toHaveLength(3); // all truthy values should pass
    });
  });
});
