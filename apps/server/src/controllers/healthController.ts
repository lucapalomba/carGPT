import { Request, Response } from 'express';
import { ollamaService } from '../services/ollamaService.js';
import { conversationService } from '../services/conversationService.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Controller for system health and maintenance operations
 */
export const healthController = {
  /**
   * Performs a health check on the server and Ollama connection
   */
  checkHealth: asyncHandler(async (req: Request, res: Response) => {
    const isOllamaConnected = await ollamaService.verifyOllama();
    
    res.json({
      status: isOllamaConnected ? 'ok' : 'degraded',
      ollama: isOllamaConnected ? 'connected' : 'disconnected',
      model: config.ollama.model,
      googleSearchConfigured: !!(config.googleSearch.apiKey && config.googleSearch.cx),
      active_conversations: conversationService.count()
    });
  })
};
