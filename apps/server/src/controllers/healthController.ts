import { Request, Response } from 'express';
import { container } from '../container/index.js';
import { SERVICE_IDENTIFIERS, IOllamaService, IConversationService } from '../container/interfaces.js';
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
    const ollamaService = container.get<IOllamaService>(SERVICE_IDENTIFIERS.OLLAMA_SERVICE);
    const conversationService = container.get<IConversationService>(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
    
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
