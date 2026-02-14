import { Request, Response } from 'express';
import { Conversation, ConversationHistoryItem } from '../services/conversationService.js';
import { container } from '../container/index.js';
import { SERVICE_IDENTIFIERS, IAIService, IConversationService } from '../container/interfaces.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';


/**
 * Controller for car search operations
 */
export const carsController = {
  /**
   * Analyzes requirements and finds cars with images
   */
  findCars: asyncHandler(async (req: Request, res: Response) => {
    const { requirements } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!requirements || requirements.trim().length < 10) {
      throw new ValidationError('Describe your needs in more detail (at least 10 characters)');
    }

    const conversationService = container.get<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
    const conversation = conversationService.getOrInitialize(sessionId);

    logger.info('Car search request received', { 
      requirements, 
      sessionId,
      provider: config.aiProvider
    });

    // Get AI service from DI container
    const aiService = container.get<IAIService>(SERVICE_IDENTIFIERS.AI_SERVICE);
    const result = await aiService.findCarsWithImages(
      requirements,
      language,
      sessionId
    );

    // Validate response
    if (!result.cars || !Array.isArray(result.cars)) {
      throw new Error('Invalid response structure from AI provider');
    }

    // Update conversation language if provided
    if (result.userLanguage) {
      conversation.userLanguage = result.userLanguage;
    }

    // Update conversation
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'find-cars',
      timestamp: new Date(),
      data: {
        requirements: requirements,
        result: result,
        provider: config.aiProvider
      }
    });

    logger.info('Suggestions generated successfully', { 
      sessionId, 
      provider: config.aiProvider,
      cars: result.cars.map((c: any) => `${c.make} ${c.model}`).join(', '),
      imagesFound: result.cars.reduce((sum: number, c: any) => sum + ((c.images && Array.isArray(c.images)) ? c.images.length : 0), 0)
    });

    res.json({
      success: true,
      conversationId: sessionId,
      ...result
    });
  }),

  /**
   * Refines car search based on feedback
   */
  refineSearch: asyncHandler(async (req: Request, res: Response) => {
    const { feedback, pinnedCars } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!feedback) {
      throw new ValidationError('Please provide some feedback to refine the search');
    }

    const conversationService = container.get<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
    const conversation = conversationService.get(sessionId);
    if (!conversation) {
      logger.warn('Refinement attempted without active conversation', { sessionId });
      throw new ValidationError('No active conversation found. Start a new search first.');
    }

    const fullContext = extractConversationContext(conversation);
    const validatedPinnedCars = Array.isArray(pinnedCars) ? pinnedCars : [];
    
    logger.info('Refining car search', { 
      sessionId, 
      feedback,
      pinnedCarsCount: validatedPinnedCars.length
    });

    // Get AI service from container for refinement
    const refineAIService = container.get<IAIService>(SERVICE_IDENTIFIERS.AI_SERVICE);
    const result = await refineAIService.refineCarsWithImages(
      feedback,
      language,
      sessionId,
      fullContext,
      validatedPinnedCars
    );

    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'refine-search',
      timestamp: new Date(),
      data: { feedback, pinnedCars, result }
    });

    res.json({
      success: true,
      ...result
    });
  }),

  /**
   * Resets the user's conversation session
   */
  resetConversation: asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.sessionID;
    const conversationService = container.get<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
    conversationService.delete(sessionId);
    
    logger.info('Conversation reset', { sessionId });
    
    res.json({
      success: true,
      message: 'Conversation reset'
    });
  })
};

/**
 * Helper to extract original request and refinement feedback from conversation history
 */
function extractConversationContext(conversation: Conversation): string {
  let originalRequirements = conversation.requirements || '';
  if (!originalRequirements && conversation.history) {
    const findAction = conversation.history.find((h: ConversationHistoryItem) => h.type === 'find-cars');
    if (findAction) {
      originalRequirements = findAction.data.requirements;
    }
  }

  if (!originalRequirements) {
    originalRequirements = "User is looking for a car.";
  }

  const contextParts = [`### Initial Request\n"${originalRequirements}"`];

  if (conversation.history) {
    conversation.history.forEach((h: ConversationHistoryItem, index: number) => {
      const stepLabel = `Refinement Step ${index + 1}`;
      
      if (h.type === 'find-cars' && h.data.result?.cars) {
        const cars = h.data.result.cars.map((c: any) => `${c.make} ${c.model} (${c.year})`).join(', ');
        contextParts.push(`### Assistant Suggestions (Initial):\n${cars}`);
      } else if (h.type === 'refine-search') {
        if (h.data.feedback) {
          contextParts.push(`### User feedback (${stepLabel}):\n"${h.data.feedback}"`);
        }
        if (h.data.result?.cars) {
          const cars = h.data.result.cars.map((c: any) => `${c.make} ${c.model} (${c.year})`).join(', ');
          contextParts.push(`### Assistant Suggestions (${stepLabel}):\n${cars}`);
        }
      }
    });
  }

  return contextParts.join('\n\n');
}
