import { Request, Response } from 'express';
import { container } from '../container/index.js';
import { SERVICE_IDENTIFIERS, IConversationService } from '../container/interfaces.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Controller for car Q&A operations
 */
export const qaController = {
  /**
   * Retrieves all active conversations (for admin/debug)
   */
  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const conversationService = container.get<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
    const rawConversations = conversationService.getAll();
    const formattedConversations = rawConversations.map(([id, data]) => ({
      id,
      ...data
    }));

    res.json({
      success: true,
      count: formattedConversations.length,
      conversations: formattedConversations
    });
  })
};
