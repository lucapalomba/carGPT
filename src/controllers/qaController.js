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
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getConversations(req, res) {
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
