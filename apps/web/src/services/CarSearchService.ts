import { api } from '../utils/api';
import type { Car, SearchResponse } from '../hooks/useCarSearch';

/**
 * Service class for handling car search business logic
 * Separates API communication and state management from React components
 */
export class CarSearchService {
  private static instance: CarSearchService;
  
  private constructor() {}
  
  /**
   * Singleton pattern to ensure one service instance
   */
  public static getInstance(): CarSearchService {
    if (!CarSearchService.instance) {
      CarSearchService.instance = new CarSearchService();
    }
    return CarSearchService.instance;
  }

  /**
   * Search for cars based on user requirements
   * @param requirements - User's car search requirements
   * @returns Promise<SearchResponse> - Search results with cars and analysis
   * @throws Error - If API call fails
   */
  async findCars(requirements: string): Promise<SearchResponse | null> {
    try {
      const data = await api.post<SearchResponse>('/api/find-cars', { requirements });
      return data;
    } catch (error) {
      console.error('CarSearchService: Error in findCars', error);
      throw new Error('Failed to search for cars. Please try again.');
    }
  }

  /**
   * Refine existing search results with user feedback
   * @param feedback - User's feedback on current results
   * @param pinnedCars - Previously pinned cars to include in results
   * @returns Promise<SearchResponse> - Refined search results
   * @throws Error - If API call fails
   */
  async refineSearch(feedback: string, pinnedCars: Car[] = []): Promise<SearchResponse | null> {
    try {
      const data = await api.post<SearchResponse>('/api/refine-search', { 
        feedback, 
        pinnedCars 
      });
      return data;
    } catch (error) {
      console.error('CarSearchService: Error in refineSearch', error);
      throw new Error('Failed to refine search results. Please try again.');
    }
  }

  /**
   * Reset conversation context on the backend
   * @throws Error - If API call fails
   */
  async resetConversation(): Promise<void> {
    try {
      await api.post('/api/reset-conversation', {});
    } catch (error) {
      console.error('CarSearchService: Error in resetConversation', error);
      throw new Error('Failed to reset conversation. Please try again.');
    }
  }

  /**
   * Validate search requirements before sending to API
   * @param requirements - User input to validate
   * @returns boolean - True if requirements are valid
   */
  validateSearchRequirements(requirements: string): boolean {
    if (!requirements || typeof requirements !== 'string') {
      return false;
    }
    
    const trimmed = requirements.trim();
    if (trimmed.length < 3) {
      return false;
    }
    
    if (trimmed.length > 1000) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate feedback before sending to API
   * @param feedback - User feedback to validate
   * @returns boolean - True if feedback is valid
   */
  validateFeedback(feedback: string): boolean {
    if (!feedback || typeof feedback !== 'string') {
      return false;
    }
    
    const trimmed = feedback.trim();
    if (trimmed.length < 3) {
      return false;
    }
    
    if (trimmed.length > 500) {
      return false;
    }
    
    return true;
  }

  /**
   * Extract car make and model from search text (simple parsing)
   * @param searchText - Text to parse
   * @returns Object with make and model if found
   */
  extractCarInfo(searchText: string): { make?: string; model?: string } | null {
    if (!searchText) return null;
    
    // Simple pattern matching for common car brands
    const brands = [
      'tesla', 'bmw', 'mercedes', 'audi', 'volkswagen', 'toyota', 'honda', 
      'ford', 'chevrolet', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru',
      'volvo', 'jaguar', 'land rover', 'porsche', 'ferrari', 'lamborghini'
    ];
    
    const text = searchText.toLowerCase();
    
    for (const brand of brands) {
      if (text.includes(brand)) {
        const brandIndex = text.indexOf(brand);
        const afterBrand = text.substring(brandIndex + brand.length).trim();
        
        // Try to extract model after brand name
        const words = afterBrand.split(' ').filter(word => word.length > 1);
        
        return {
          make: brand.charAt(0).toUpperCase() + brand.slice(1),
          model: words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : undefined
        };
      }
    }
    
    return null;
  }

  /**
   * Format car display information
   * @param car - Car object to format
   * @returns Formatted string representation
   */
  formatCarDisplay(car: Car): string {
    if (!car) return 'Unknown Car';
    
    const make = car.make || 'Unknown';
    const model = car.model || 'Unknown';
    const year = car.year || '';
    
    const baseInfo = `${make} ${model}`;
    return year ? `${year} ${baseInfo}` : baseInfo;
  }
}

// Export singleton instance for easy usage
export const carSearchService = CarSearchService.getInstance();