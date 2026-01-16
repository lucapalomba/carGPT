import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imageSearchService } from '../imageSearchService.js';

describe('imageSearchService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('searchCarImages', () => {
    it('should return images on success', async () => {
      const mockData = {
        items: [
          {
            link: 'http://example.com/image.jpg',
            image: {
              thumbnailLink: 'http://example.com/thumb.jpg',
              width: 800,
              height: 600
            },
            title: 'Test Car',
            displayLink: 'example.com'
          }
        ]
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData
      });

      const images = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020');
      
      expect(images).toHaveLength(1);
      expect(images[0].url).toBe('http://example.com/image.jpg');
      expect(images[0].source).toBe('example.com');
    });

    it('should return empty array if no items found', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const images = await imageSearchService.searchCarImages('NonExistent', 'Car');
      expect(images).toEqual([]);
    });

    it('should return empty array on fetch error', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      });

      const images = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(images).toEqual([]);
    });
  });

  describe('searchMultipleCars', () => {
    it('should search for multiple cars in parallel', async () => {
      const mockData = {
        items: [{ link: 'http://img.jpg', image: { thumbnailLink: 'http://thumb.jpg' } }]
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData
      });

      const cars = [
        { make: 'Toyota', model: 'Corolla' },
        { make: 'Honda', model: 'Civic' }
      ];

      const results = await imageSearchService.searchMultipleCars(cars);
      
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['Toyota-Corolla']).toBeDefined();
      expect(results['Honda-Civic']).toBeDefined();
    });
  });
});
