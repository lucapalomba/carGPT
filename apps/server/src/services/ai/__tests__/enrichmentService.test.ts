import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnrichmentService } from '../enrichmentService.js';
import { config } from '../../../config/index.js';

vi.mock('../../../config/index.js', async () => {
  const originalConfig = await vi.importActual('../../../config/index.js') as any;
  return {
    ...originalConfig,
    config: {
      ...originalConfig.config,
      carouselImageLength: 5,
    },
  };
});

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

  afterEach(() => {
    // Restore any config mutated by the tests, even on failure
    (config as any).carouselImageLength = 5;
    (config as any).sequentialPromiseExecution = false;
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

    it('should skip image search when carouselImageLength is 0', async () => {
      const { config } = await import('../../../config/index.js');
      const previous = config.carouselImageLength;
      (config as any).carouselImageLength = 0;
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [{ make: 'Toyota', model: 'Corolla', year: 2020 }];

      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);

      expect(mockImageSearchService.searchMultipleCars).not.toHaveBeenCalled();
      expect(result).toEqual(cars);
      (config as any).carouselImageLength = previous;
    });

    it('should propagate image search failures', async () => {
      const spanEnd = vi.fn();
      const mockTrace = { span: vi.fn().mockReturnValue({ end: spanEnd }) };
      mockImageSearchService.searchMultipleCars.mockRejectedValue(new Error('search down'));

      await expect(
        enrichmentService.enrichCarsWithImages([{ make: 'Toyota', model: 'Corolla', year: 2020 }] as any, mockTrace)
      ).rejects.toThrow('search down');
      expect(spanEnd).toHaveBeenCalledWith(expect.objectContaining({ level: 'ERROR' }));
    });

    it('should process cars sequentially (strictly in order) when enabled', async () => {
      const { config } = await import('../../../config/index.js');
      const previous = config.sequentialPromiseExecution;
      (config as any).sequentialPromiseExecution = true;

      const invocationOrder: string[] = [];
      const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
      const cars = [
        { make: 'Toyota', model: 'Corolla', year: 2020 },
        { make: 'Honda', model: 'Civic', year: 2021 }
      ];
      mockImageSearchService.searchMultipleCars.mockResolvedValue({
        'Toyota-Corolla': [{ url: 'a.jpg' }],
        'Honda-Civic': [{ url: 'b.jpg' }]
      });
      mockOllamaService.verifyImageContainsCar.mockImplementation((carInfo: string) => {
        invocationOrder.push(carInfo);
        return Promise.resolve(true);
      });

      const result = await enrichmentService.enrichCarsWithImages(cars as any, mockTrace);

      expect(result).toHaveLength(2);
      expect(result[0].images).toEqual([{ url: 'a.jpg' }]);
      expect(result[1].images).toEqual([{ url: 'b.jpg' }]);
      // Strict order proves sequential execution (parallel would not preserve it)
      expect(invocationOrder).toEqual(['Toyota Corolla', 'Honda Civic']);
      (config as any).sequentialPromiseExecution = previous;
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
