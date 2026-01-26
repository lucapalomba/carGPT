import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthController } from '../healthController.js';
import { container } from '../../container/index.js';
import { SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import { Request, Response } from 'express';

// Mock the dependencies
vi.mock('../../container/index.js', () => ({
  container: {
    get: vi.fn(),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    ollama: { model: 'llama3:test' },
    googleSearch: { apiKey: 'key', cx: 'cx' },
    mode: 'test'
  }
}));

describe('healthController', () => {
  let mockOllamaService: any;
  let mockConversationService: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockOllamaService = {
      verifyOllama: vi.fn(),
    };
    
    mockConversationService = {
      count: vi.fn(),
    };

    // Setup container mock
    (container.get as any).mockImplementation((identifier: symbol) => {
      if (identifier === SERVICE_IDENTIFIERS.OLLAMA_SERVICE) return mockOllamaService;
      if (identifier === SERVICE_IDENTIFIERS.CONVERSATION_SERVICE) return mockConversationService;
      throw new Error(`Unknown identifier: ${String(identifier)}`);
    });

    mockReq = {};
    jsonSpy = vi.fn();
    mockRes = {
      json: jsonSpy,
    };
  });

  describe('checkHealth', () => {
    it('should return health status ok when ollama is connected', async () => {
      mockOllamaService.verifyOllama.mockResolvedValue(true);
      mockConversationService.count.mockReturnValue(5);

      await healthController.checkHealth(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockOllamaService.verifyOllama).toHaveBeenCalled();
      expect(mockConversationService.count).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        ollama: 'connected',
        model: 'llama3:test',
        googleSearchConfigured: true,
        active_conversations: 5
      });
    });

    it('should return health status degraded when ollama is disconnected', async () => {
      mockOllamaService.verifyOllama.mockResolvedValue(false);
      mockConversationService.count.mockReturnValue(0);

      await healthController.checkHealth(mockReq as Request, mockRes as Response, vi.fn());

      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'degraded',
        ollama: 'disconnected',
        active_conversations: 0
      }));
    });
  });
});
