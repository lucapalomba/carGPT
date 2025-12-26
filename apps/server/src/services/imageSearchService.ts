import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import * as cheerio from 'cheerio';

export interface CarImage {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width?: number;
  height?: number;
}

async function getVQD(query) {
  const html = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=it-it`,
    { headers: { 'User-Agent': "Mozilla/5.0" } }
  ).then(r => r.text());

  const m = html.match(/vqd=([\d\-]+)/);
  if (!m) throw new Error('VQD non trovato');
  return m[1];
}

export async function ddgImages(query, max = 100) {
  const vqd = await getVQD(query);
  const images = [];
  let next;                       // cursore per la paginazione

  while (images.length < max) {
    const url = new URL('https://duckduckgo.com/i.js');
    url.searchParams.set('l', 'it-it');
    url.searchParams.set('o', 'json');
    url.searchParams.set('q', query);
    url.searchParams.set('vqd', vqd);
    url.searchParams.set('f', ',,,,');
    url.searchParams.set('p', next ?? -1);

    const res = await fetch(url, {
      headers: { 'User-Agent': "Mozilla/5.0", Accept: 'application/json' }
    });

    if (!res.ok) throw new Error(`Errore ${res.status} su ${url.href}`);

    const data = await res.json();
    if (!data.results?.length) break;   // finite le foto

    for (const item of data.results) {
      images.push(item.image);          // URL full-size
      if (images.length >= max) break;
    }
    next = data.next;                   // cursore per il prossimo blocco
    if (!next) break;                   // non c’è più nulla
  }
  return images;
}

/**
 * Service to search car images using Brave Search API
 */
export const imageSearchService = {
  /**
   * Search for images of a specific car model using DuckDuckgo
   * 
   * @param make - Car manufacturer (e.g., 'Toyota', 'BMW')
   * @param model - Car model name (e.g., 'Corolla', 'X5')
   * @param year - Car year (optional, e.g., '2024', '2023')
   * @param count - Number of images to return (default: 3, max: 5)
   * @returns Array of car images
   */
  async searchCarImages(
    make: string, 
    model: string, 
    year: string = '', 
    count: number = 3
  ): Promise<CarImage[]> {
    try {
      // Construct search query
      const query = year 
        ? `${year} ${make} ${model} official car photo`
        : `${make} ${model} official car photo`;
      
      logger.debug('Searching car images with DuckDuckGo API', { query });

      const imagesArray = await ddgImages(query, 1);

      console.log(imagesArray);

      // Transform results to our CarImage format
      const images: CarImage[] = imagesArray.map((img: any) => ({
        url: img || '',
        thumbnail: img || '',
        title: `${make} ${model}`,
        source: img || '',
        width: img || '',
        height: img || ''
      }));

      logger.info(`Found ${images.length} images for ${make} ${model}`, { 
        make, 
        model, 
        year,
        count: images.length 
      });

      return images;

    } catch (error: any) {
      logger.error('Error searching images with DuckDuckGo API', { 
        error: error.message,
        make,
        model,
        year
      });
      
      // Return empty array instead of throwing to not break the main flow
      return [];
    }
  },

  /**
   * Search images for multiple cars in parallel
   * 
   * @param cars - Array of car objects with make, model, year
   * @returns Map of car key to images array
   */
  async searchMultipleCars(
    cars: Array<{ make: string; model: string; year?: string }>
  ): Promise<Record<string, CarImage[]>> {
    const promises = cars.map(async (car) => {
      try {
        const images = await this.searchCarImages(
          car.make, 
          car.model, 
          car.year || '', 
          3
        );
        
        const carKey = `${car.make}-${car.model}`;
        return { carKey, images, success: true };
        
      } catch (error: any) {
        logger.error(`Failed to fetch images for ${car.make} ${car.model}`, { 
          error: error.message 
        });
        
        const carKey = `${car.make}-${car.model}`;
        return { carKey, images: [], success: false };
      }
    });

    const results = await Promise.allSettled(promises);
    
    // Build result map
    const imageMap: Record<string, CarImage[]> = {};
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        imageMap[result.value.carKey] = result.value.images;
      } else {
        // Handle rejected promises
        const car = cars[index];
        const carKey = `${car.make}-${car.model}`;
        imageMap[carKey] = [];
      }
    });

    return imageMap;
  }
};
