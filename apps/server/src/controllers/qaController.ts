import { Request, Response } from 'express';
import { conversationService } from '../services/conversationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Controller for car Q&A operations
 */
export const qaController = {
  /**
   * Retrieves all active conversations (for admin/debug)
   */
  getConversations: asyncHandler(async (req: Request, res: Response) => {
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
