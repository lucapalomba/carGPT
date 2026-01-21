import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imageSearchService, CarImage } from '../imageSearchService.js';
import { config } from '../../config/index.js';

// Mock fetch to avoid external API calls
global.fetch = vi.fn();

describe('imageSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchCarImages', () => {
    it('should return empty array when API key is missing', async () => {
      // Override config for this test
      const originalApiKey = config.googleSearch.apiKey;
      config.googleSearch.apiKey = '';
      
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      
      expect(result).toEqual([]);
      config.googleSearch.apiKey = originalApiKey;
    });

    it('should return empty array when CX is missing', async () => {
      const originalCx = config.googleSearch.cx;
      config.googleSearch.cx = '';
      
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      
      expect(result).toEqual([]);
      config.googleSearch.cx = originalCx;
    });

    it('should construct correct query with year', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              link: 'https://example.com/image1.jpg',
              image: {
                thumbnailLink: 'https://example.com/thumb1.jpg',
                width: 800,
                height: 600
              },
              title: 'Toyota Corolla 2020',
              displayLink: 'example.com'
            }
          ]
        })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=2020+Toyota+Corolla')
      );
    });

    it('should construct correct query without year', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=Toyota+Corolla')
      );
    });

    it('should handle successful API response with multiple images', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              link: 'https://example.com/image1.jpg',
              image: {
                thumbnailLink: 'https://example.com/thumb1.jpg',
                width: 800,
                height: 600
              },
              title: 'Toyota Corolla 2020',
              displayLink: 'example.com'
            },
            {
              link: 'https://example.com/image2.jpg',
              image: {
                thumbnailLink: 'https://example.com/thumb2.jpg',
                width: 1024,
                height: 768
              },
              title: 'Toyota Corolla 2020 Side',
              displayLink: 'cars.com'
            }
          ]
        })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        url: 'https://example.com/image1.jpg',
        thumbnail: 'https://example.com/thumb1.jpg',
        title: 'Toyota Corolla 2020',
        source: 'example.com',
        width: 800,
        height: 600
      });
      expect(result[1]).toEqual({
        url: 'https://example.com/image2.jpg',
        thumbnail: 'https://example.com/thumb2.jpg',
        title: 'Toyota Corolla 2020 Side',
        source: 'cars.com',
        width: 1024,
        height: 768
      });
    });

    it('should handle API response with missing optional fields', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              link: 'https://example.com/image1.jpg',
              image: {
                thumbnailLink: 'https://example.com/thumb1.jpg'
              },
              title: 'Toyota Corolla'
              // missing displayLink, width, height
            }
          ]
        })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 1);

      expect(result[0]).toEqual({
        url: 'https://example.com/image1.jpg',
        thumbnail: 'https://example.com/thumb1.jpg',
        title: 'Toyota Corolla',
        source: '',
        width: undefined,
        height: undefined
      });
    });

    it('should handle API response with no items', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(result).toEqual([]);
    });

    it('should handle API response with null items', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: null })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(result).toEqual([]);
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Invalid request' })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(result).toEqual([]);
    });

    it('should handle network error', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(result).toEqual([]);
    });

    it('should handle JSON parse error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);

      expect(result).toEqual([]);
    });

    it('should use correct URL parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 5);

      const calledUrl = (fetch as any).mock.calls[0][0];
      expect(calledUrl).toContain('key=');
      expect(calledUrl).toContain('cx=');
      expect(calledUrl).toContain('searchType=image');
      expect(calledUrl).toContain('imgType=photo');
      expect(calledUrl).toContain('safe=active');
      expect(calledUrl).toContain('num=5');
    });
  });

  describe('searchMultipleCars', () => {
    it('should search images for multiple cars in parallel', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [
            {
              link: 'https://example.com/image.jpg',
              image: { thumbnailLink: 'https://example.com/thumb.jpg' },
              title: 'Car Image',
              displayLink: 'example.com'
            }
          ]
        })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const cars = [
        { make: 'Toyota', model: 'Corolla', year: '2020' },
        { make: 'Honda', model: 'Civic', year: '2021' }
      ];

      const result = await imageSearchService.searchMultipleCars(cars);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['Toyota-Corolla']).toHaveLength(1);
      expect(result['Honda-Civic']).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle cars without year', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const cars = [
        { make: 'Toyota', model: 'Corolla' }
      ];

      const result = await imageSearchService.searchMultipleCars(cars);

      expect(result['Toyota-Corolla']).toEqual([]);
    });

    it('should handle mixed success and failure cases', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any)
        .mockResolvedValueOnce(mockResponse) // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Second call fails

      const cars = [
        { make: 'Toyota', model: 'Corolla' },
        { make: 'Honda', model: 'Civic' }
      ];

      const result = await imageSearchService.searchMultipleCars(cars);

      expect(result['Toyota-Corolla']).toEqual([]);
      expect(result['Honda-Civic']).toEqual([]);
    });

    it('should use config.carouselImageLength for image count', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const cars = [{ make: 'Toyota', model: 'Corolla' }];
      
      await imageSearchService.searchMultipleCars(cars);

      const calledUrl = (fetch as any).mock.calls[0][0];
      expect(calledUrl).toContain(`num=${config.carouselImageLength}`);
    });

    it('should handle empty cars array', async () => {
      const result = await imageSearchService.searchMultipleCars([]);

      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should preserve car key format correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      };
      
      (fetch as any).mockResolvedValue(mockResponse);

      const cars = [
        { make: 'BMW', model: 'M3' },
        { make: 'Mercedes-Benz', model: 'C-Class' }
      ];

      const result = await imageSearchService.searchMultipleCars(cars);

      expect(result).toHaveProperty('BMW-M3');
      expect(result).toHaveProperty('Mercedes-Benz-C-Class');
    });
  });
});