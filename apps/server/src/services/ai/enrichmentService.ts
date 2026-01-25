import { injectable, inject } from 'inversify';
import { IEnrichmentService, IOllamaService, IImageSearchService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import logger from '../../utils/logger.js';
import { Car } from './types.js';

@injectable()
export class EnrichmentService implements IEnrichmentService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.IMAGE_SEARCH_SERVICE) private imageSearchService: IImageSearchService
  ) {}

  /**
   * Enrich cars with images
   */
  async enrichCarsWithImages(cars: Car[] = [], trace: any): Promise<Car[]> {
    const carList = Array.isArray(cars) ? cars : [];
    const span = trace.span({ name: "enrich_with_images", input: { count: carList.length } });
    try {
      if (carList.length === 0) {
        span.end({ output: { count: 0 } });
        return [];
      }
      logger.info(`Searching images for ${carList.length} cars`);
      const imageMap = await this.imageSearchService.searchMultipleCars(
        carList.map(c => ({ make: c.make, model: c.model, year: c.year?.toString() }))
      );

      const carsWithImages = await Promise.all(carList.map(async (car: Car) => {
        const key = `${car.make}-${car.model}`;
        const rawImages = imageMap[key] || [];
        const verifiedImages = await this.filterImages(car.make, car.model, car.year, rawImages, trace);
        return { ...car, images: verifiedImages };
      }));

      span.end({ output: { count: carsWithImages.length } });
      return carsWithImages;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }

  /**
   * Filters images using vision to ensure they contain the specified car
   */
  async filterImages(make: string, model: string, year: string | number, images: unknown[], trace: any): Promise<any[]> {
    if (images.length === 0) return [];
    const span = trace.span({ name: "filter_images_vision", input: { make, model, count: images.length } });
    
    try {
      const carInfo = `${make} ${model}`;
      const verifiedImages = [];

      for (const image of (images as any[])) {
        const urlToVerify = image.thumbnail || image.url;
        const isValid = await this.ollamaService.verifyImageContainsCar(carInfo, year, urlToVerify, trace);
        if (isValid) verifiedImages.push(image);
      }

      span.end({ output: { verifiedCount: verifiedImages.length } });
      return verifiedImages;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      return (images as any[]).slice(0, 3); // Fallback to first 3 images if vision fails
    }
  }
}
