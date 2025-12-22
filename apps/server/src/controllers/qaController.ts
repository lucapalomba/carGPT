import { Request, Response } from 'express';
import { ollamaService } from '../services/ollamaService.js';
import { promptService } from '../services/promptService.js';
import { conversationService } from '../services/conversationService.js';
import { config } from '../config/index.js';

/**
 * Controller for car Q&A operations
 */
export const qaController = {
  /**
   * Retrieves all active conversations (for admin/debug)
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  getConversations(req: Request, res: Response) {
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
  }
};
