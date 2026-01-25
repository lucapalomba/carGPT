import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageSearchService } from '../imageSearchService.js';
import { config } from '../../config/index.js';

// Mock fetch to avoid external API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ImageSearchService', () => {
  let imageSearchService: ImageSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    imageSearchService = new ImageSearchService();
    
    // Reset config with test values
    config.googleSearch.apiKey = 'test-api-key';
    config.googleSearch.cx = 'test-cx';
  });

  describe('searchCarImages', () => {
    it('should return empty array when API key is missing', async () => {
      config.googleSearch.apiKey = '';
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      expect(result).toEqual([]);
    });

    it('should return empty array when CX is missing', async () => {
      config.googleSearch.cx = '';
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      expect(result).toEqual([]);
    });

    it('should construct correct query with year', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [{
            link: 'https://example.com/image1.jpg',
            image: { thumbnailLink: 'https://example.com/thumb1.jpg' },
            title: 'Toyota Corolla 2020',
            displayLink: 'example.com'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/q=2020[+%20]Toyota[+%20]Corolla/));
    });
  });
});