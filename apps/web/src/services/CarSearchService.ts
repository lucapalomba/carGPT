import { api } from '../utils/api';
import { conversationRepository } from '../repositories/ConversationRepository';
import type { Car, SearchResponse } from '../hooks/useCarSearch';
import type { ConversationMessage } from '../repositories/ConversationRepository';

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
   * Get or create current conversation ID for session
   * @param sessionId - Session identifier
   * @returns Promise<string> - Conversation ID
   */
  private async getCurrentConversationId(sessionId: string): Promise<string> {
    try {
      const conversations = await conversationRepository.findBySessionId(sessionId);
      
      if (conversations.length > 0) {
        return conversations[0].id; // Use most recent conversation
      }
      
      // Create new conversation
      const newConversation = await conversationRepository.create(sessionId);
      return newConversation.id;
    } catch (error) {
      console.error('CarSearchService: Error getting/creating conversation', error);
      // Fallback: generate temporary ID
      return `temp-${Date.now()}`;
    }
  }

  /**
   * Search for cars based on user requirements
   * @param requirements - User's car search requirements
   * @param sessionId - Session identifier for conversation tracking
   * @returns Promise<SearchResponse> - Search results with cars and analysis
   * @throws Error - If API call fails
   */
  async findCars(requirements: string, sessionId: string): Promise<SearchResponse | null> {
    const startTime = Date.now();
    
    try {
      // Log user message to conversation
      await conversationRepository.addMessage(
        await this.getCurrentConversationId(sessionId),
        {
          timestamp: new Date(),
          type: 'user',
          content: requirements,
          metadata: { searchIntent: 'initial_search' }
        }
      );

      const data = await api.post<SearchResponse>('/api/find-cars', { requirements });
      
      // Log assistant response to conversation
      if (data) {
        await conversationRepository.addMessage(
          await this.getCurrentConversationId(sessionId),
          {
            timestamp: new Date(),
            type: 'assistant',
            content: data.analysis,
            metadata: {
              carCount: data.cars?.length || 0,
              processingTime: Date.now() - startTime
            }
          } as ConversationMessage
        );
      }
      
      return data;
    } catch (error) {
      // Log error to conversation
      await conversationRepository.addMessage(
        await this.getCurrentConversationId(sessionId),
        {
          timestamp: new Date(),
          type: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: { processingTime: Date.now() - startTime }
        } as unknown as ConversationMessage
      );
      
      console.error('CarSearchService: Error in findCars', error);
      throw new Error('Failed to search for cars. Please try again.');
    }
  }

  /**
   * Refine existing search results with user feedback
   * @param feedback - User's feedback on current results
   * @param pinnedCars - Previously pinned cars to include in results
   * @param sessionId - Session identifier for conversation tracking
   * @returns Promise<SearchResponse> - Refined search results
   * @throws Error - If API call fails
   */
  async refineSearch(feedback: string, pinnedCars: Car[] = [], sessionId?: string): Promise<SearchResponse | null> {
    const startTime = Date.now();
    
    try {
      if (sessionId) {
        // Log user feedback to conversation
        await conversationRepository.addMessage(
          await this.getCurrentConversationId(sessionId),
          {
            timestamp: new Date(),
            type: 'user',
            content: feedback,
            metadata: { 
              searchIntent: 'refinement',
              feedback,
              pinnedCarsCount: pinnedCars.length
            }
          } as unknown as ConversationMessage
        );
      }

      const data = await api.post<SearchResponse>('/api/refine-search', { 
        feedback, 
        pinnedCars 
      });
      
      if (sessionId && data) {
        // Log assistant response to conversation
        await conversationRepository.addMessage(
          await this.getCurrentConversationId(sessionId),
          {
            timestamp: new Date(),
            type: 'assistant',
            content: data.analysis,
            metadata: {
              carCount: data.cars?.length || 0,
              processingTime: Date.now() - startTime,
              feedbackLength: feedback.length
            }
          } as unknown as ConversationMessage
        );
      }
      
      return data;
    } catch (error) {
      if (sessionId) {
        // Log error to conversation
        await conversationRepository.addMessage(
          await this.getCurrentConversationId(sessionId),
          {
            timestamp: new Date(),
            type: 'system',
            content: `Refinement Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { processingTime: Date.now() - startTime }
          } as unknown as ConversationMessage
        );
      }
      
      console.error('CarSearchService: Error in refineSearch', error);
      throw new Error('Failed to refine search results. Please try again.');
    }
  }

  /**
   * Reset conversation context on backend
   * @param sessionId - Session identifier for cleanup
   * @throws Error - If API call fails
   */
  async resetConversation(sessionId?: string): Promise<void> {
    try {
      await api.post('/api/reset-conversation', {});
      
      if (sessionId) {
        // Clear conversation data for this session
        const conversations = await conversationRepository.findBySessionId(sessionId);
        for (const conversation of conversations) {
          await conversationRepository.delete(conversation.id);
        }
      }
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

  /**
   * Update conversation data after search results
   * @param sessionId - Session identifier
   * @param cars - Current search results
   * @param analysisHistory - Analysis history
   * @param pinnedIndices - Pinned indices
   * @returns Promise<void>
   */
  async updateConversationData(
    sessionId: string,
    cars?: Car[],
    analysisHistory?: string[],
    pinnedIndices?: Set<number>
  ): Promise<void> {
    try {
      await conversationRepository.updateConversationData(
        await this.getCurrentConversationId(sessionId),
        cars,
        analysisHistory,
        pinnedIndices
      );
    } catch (error) {
      console.error('CarSearchService: Error updating conversation data', error);
      // Don't throw - this is not critical for search functionality
    }
  }
}

// Export singleton instance for easy usage
export const carSearchService = CarSearchService.getInstance();