import { config } from '../config/index.js';
import logger from '../utils/logger.js';

export interface CarImage {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
}

interface GoogleSearchResponse {
  items?: Array<{
    link?: string;
    image?: {
      thumbnailLink?: string;
      width?: number;
      height?: number;
    };
    title?: string;
    displayLink?: string;
  }>;
}

/**
 * Service to search car images using Google Custom Search API
 */
export const imageSearchService = {
  /**
   * Search for images of a specific car model using Google Custom Search
   * 
   * @param make - Car manufacturer
   * @param model - Car model name
   * @param year - Car year
   * @param count - Number of images to return (default: 3)
   * @returns Array of car images
   */
  async searchCarImages(
    make: string, 
    model: string, 
    year: string = '', 
    count: number = 1
  ): Promise<CarImage[]> {
    const { apiKey, cx } = config.googleSearch;

    if (!apiKey || !cx) {
      logger.warn('Google Search API Key or CX not configured. Skipping image search.');
      return [];
    }

    try {
      const query = year 
        ? `${year} ${make} ${model}`
        : `${make} ${model}`;
      
      logger.debug('Searching car images with Google Custom Search', { query });

      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('imgType', 'photo');
      url.searchParams.set('safe', 'active');
      url.searchParams.set('num', count.toString());

      const res = await fetch(url.href);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Google API Error ${res.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await res.json() as GoogleSearchResponse;
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      const images: CarImage[] = data.items.map((item: any) => ({
        url: item.link || '',
        thumbnail: item.image?.thumbnailLink || '',
        title: item.title || `${make} ${model}`,
        source: item.displayLink || '',
        width: item.image?.width,
        height: item.image?.height
      }));

      logger.info(`Found ${images.length} images for ${make} ${model}`, { 
        make, 
        model, 
        year,
        count: images.length 
      });

      return images;

    } catch (error: any) {
      logger.error('Error searching images with Google Custom Search API', { 
        error: error.message,
        make,
        model,
        year
      });
      
      return [];
    }
  },

  /**
   * Search images for multiple cars in parallel
   */
  async searchMultipleCars(
    cars: Array<{ make: string; model: string; year?: string }>
  ): Promise<Record<string, CarImage[]>> {
    const promises = cars.map(async (car) => {
      const images = await this.searchCarImages(
        car.make, 
        car.model, 
        car.year?.toString() || '', 
        config.carouselImageLength
      );
      
      const carKey = `${car.make}-${car.model}`;
      return { carKey, images };
    });

    const results = await Promise.allSettled(promises);
    const imageMap: Record<string, CarImage[]> = {};
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        imageMap[result.value.carKey] = result.value.images;
      } else {
        const car = cars[index];
        const carKey = `${car.make}-${car.model}`;
        imageMap[carKey] = [];
      }
    });

    return imageMap;
  }
};
