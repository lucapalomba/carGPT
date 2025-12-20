import { ollamaService } from '../services/ollamaService.js';
import { conversationService } from '../services/conversationService.js';
import { config } from '../config/index.js';

/**
 * Controller for system health and maintenance operations
 */
export const healthController = {
  /**
   * Performs a health check on the server and Ollama connection
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async checkHealth(req, res) {
    const isOllamaConnected = await ollamaService.verifyOllama();
    
    res.json({
      status: isOllamaConnected ? 'ok' : 'degraded',
      ollama: isOllamaConnected ? 'connected' : 'disconnected',
      model: config.ollama.model,
      active_conversations: conversationService.count()
    });
  },

  /**
   * Resets the user's conversation session
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  resetConversation(req, res) {
    const sessionId = req.sessionID;
    conversationService.delete(sessionId);
    
    console.log(`♻️ Conversation reset for session: ${sessionId}`);
    
    res.json({
      success: true,
      message: 'Conversation reset'
    });
  }
};
