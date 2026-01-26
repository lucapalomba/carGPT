import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthController } from '../healthController.js';
import { container } from '../../container/index.js';
import { SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import { Request, Response } from 'express';

// Mock container
vi.mock('../../container/index.js', () => ({
  container: {
    get: vi.fn()
  }
}));

describe('healthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockOllamaService: any;
  let mockConversationService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {};
    mockResponse = {
      json: vi.fn()
    };

    mockOllamaService = {
      verifyOllama: vi.fn()
    };

    mockConversationService = {
      count: vi.fn().mockReturnValue(5)
    };

    vi.mocked(container.get).mockImplementation((id) => {
      if (id === SERVICE_IDENTIFIERS.OLLAMA_SERVICE) return mockOllamaService;
      if (id === SERVICE_IDENTIFIERS.CONVERSATION_SERVICE) return mockConversationService;
      return null;
    });
  });

  it('should return 200 and ok status when Ollama is connected', async () => {
    mockOllamaService.verifyOllama.mockResolvedValue(true);

    await (healthController.checkHealth as any)(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ok',
      ollama: 'connected',
      active_conversations: 5
    }));
  });

  it('should return 200 and degraded status when Ollama is disconnected', async () => {
    mockOllamaService.verifyOllama.mockResolvedValue(false);

    await (healthController.checkHealth as any)(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'degraded',
      ollama: 'disconnected',
      active_conversations: 5
    }));
  });
});
