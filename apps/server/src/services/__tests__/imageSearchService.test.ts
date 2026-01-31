import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageSearchService } from '../imageSearchService.js';
import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

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
    config.carouselImageLength = 1; // Default to 1 for consistent testing
    config.sequentialPromiseExecution = false; // Default to parallel
  });

  describe('searchCarImages', () => {
    it('should return empty array when API key is missing', async () => {
      config.googleSearch.apiKey = '';
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Google Search API Key or CX not configured. Skipping image search.');
    });

    it('should return empty array when CX is missing', async () => {
      config.googleSearch.cx = '';
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla', '2020', 3);
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Google Search API Key or CX not configured. Skipping image search.');
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
      expect(logger.debug).toHaveBeenCalledWith('Searching car images with Google Custom Search', { query: '2020 Toyota Corolla' });
      expect(logger.info).toHaveBeenCalledWith('Found 1 images for Toyota Corolla', expect.any(Object));
    });

    it('should construct correct query without year', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [{
            link: 'https://example.com/image1.jpg',
            image: { thumbnailLink: 'https://example.com/thumb1.jpg' },
            title: 'Toyota Corolla',
            displayLink: 'example.com'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      await imageSearchService.searchCarImages('Toyota', 'Corolla', '', 3);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/q=Toyota[+%20]Corolla/));
      expect(logger.debug).toHaveBeenCalledWith('Searching car images with Google Custom Search', { query: 'Toyota Corolla' });
    });

    it('should return empty array if fetch response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Bad Request' })
      };
      mockFetch.mockResolvedValue(mockResponse);
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error searching images'), expect.any(Object));
    });

    it('should return empty array if fetch throws an error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error searching images'), expect.any(Object));
    });

    it('should return empty array if data.items is missing or not an array', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ items: null }) });
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(result).toEqual([]);

      mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ items: {} }) });
      const result2 = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(result2).toEqual([]);
    });

    it('should map Google Search response to CarImage format', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          items: [{
            link: 'https://example.com/image1.jpg',
            image: { thumbnailLink: 'https://example.com/thumb1.jpg', width: 100, height: 50 },
            title: 'Car Title',
            displayLink: 'source.com'
          }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);
      const result = await imageSearchService.searchCarImages('Toyota', 'Corolla');
      expect(result).toEqual([{
        url: 'https://example.com/image1.jpg',
        thumbnail: 'https://example.com/thumb1.jpg',
        title: 'Car Title',
        source: 'source.com',
        width: 100,
        height: 50
      }]);
    });
  });

  describe('searchMultipleCars', () => {
    const carsToSearch = [
      { make: 'Toyota', model: 'Corolla', year: '2020' },
      { make: 'Honda', model: 'Civic', year: '2021' },
    ];
    const mockImageResponse = (make: string, model: string) => ({
      items: [{
        link: `https://example.com/${make}-${model}.jpg`,
        image: { thumbnailLink: `https://example.com/${make}-${model}-thumb.jpg` },
        title: `${make} ${model}`,
        displayLink: 'example.com'
      }]
    });

    it('should search for multiple cars in parallel (default)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockImageResponse('Toyota', 'Corolla')) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockImageResponse('Honda', 'Civic')) });

      const result = await imageSearchService.searchMultipleCars(carsToSearch);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        'Toyota-Corolla': [{
          url: 'https://example.com/Toyota-Corolla.jpg',
          thumbnail: 'https://example.com/Toyota-Corolla-thumb.jpg',
          title: 'Toyota Corolla',
          source: 'example.com'
        }],
        'Honda-Civic': [{
          url: 'https://example.com/Honda-Civic.jpg',
          thumbnail: 'https://example.com/Honda-Civic-thumb.jpg',
          title: 'Honda Civic',
          source: 'example.com'
        }],
      });
    });

    it('should search for multiple cars sequentially when enabled', async () => {
      config.sequentialPromiseExecution = true;
      mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockImageResponse('Toyota', 'Corolla')) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockImageResponse('Honda', 'Civic')) });

      const result = await imageSearchService.searchMultipleCars(carsToSearch);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Verify sequential execution by checking call order if needed, but not directly testable with fetch mock
      expect(result).toEqual({
        'Toyota-Corolla': [{
          url: 'https://example.com/Toyota-Corolla.jpg',
          thumbnail: 'https://example.com/Toyota-Corolla-thumb.jpg',
          title: 'Toyota Corolla',
          source: 'example.com'
        }],
        'Honda-Civic': [{
          url: 'https://example.com/Honda-Civic.jpg',
          thumbnail: 'https://example.com/Honda-Civic-thumb.jpg',
          title: 'Honda Civic',
          source: 'example.com'
        }],
      });
    });

    it('should handle rejected promises in parallel execution', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(mockImageResponse('Toyota', 'Corolla')) });
      mockFetch.mockRejectedValueOnce(new Error('Image search failed for Honda'));

      const result = await imageSearchService.searchMultipleCars(carsToSearch);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        'Toyota-Corolla': [{
          url: 'https://example.com/Toyota-Corolla.jpg',
          thumbnail: 'https://example.com/Toyota-Corolla-thumb.jpg',
          title: 'Toyota Corolla',
          source: 'example.com'
        }],
        'Honda-Civic': [], // Expect empty array for failed search
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error searching images'), expect.any(Object));
    });
  });
});