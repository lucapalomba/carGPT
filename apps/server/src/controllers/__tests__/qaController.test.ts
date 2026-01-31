import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { qaController } from '../qaController.js';
import { SERVICE_IDENTIFIERS } from '../../container/interfaces.js';

// Mock container
vi.mock('../../container/index.js', () => ({
  container: {
    get: vi.fn()
  }
}));

import { container } from '../../container/index.js';

// Mock asyncHandler
vi.mock('../../utils/asyncHandler.js', () => ({
  asyncHandler: (fn: any) => fn
}));

describe('qaController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockConversationService: any;

  beforeEach(() => {
    mockConversationService = {
      getAll: vi.fn()
    };

    (container.get as any).mockReturnValue(mockConversationService);

    mockReq = {
      // Add any request properties needed
    };

    mockRes = {
      json: vi.fn()
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConversations', () => {
    it('should retrieve all conversations and format them correctly', async () => {
      // Arrange
      const mockRawConversations: [string, any][] = [
        ['session-1', { sessionId: 'session-1', messageCount: 5 }],
        ['session-2', { sessionId: 'session-2', messageCount: 3 }]
      ];

      mockConversationService.getAll.mockReturnValue(mockRawConversations);
      
      // Act
      await qaController.getConversations(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(container.get).toHaveBeenCalledWith(SERVICE_IDENTIFIERS.CONVERSATION_SERVICE);
      expect(mockConversationService.getAll).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        conversations: [
          { id: 'session-1', sessionId: 'session-1', messageCount: 5 },
          { id: 'session-2', sessionId: 'session-2', messageCount: 3 }
        ]
      });
    });

    it('should handle empty conversations list', async () => {
      // Arrange
      const emptyConversations: any[] = [];
      mockConversationService.getAll.mockReturnValue(emptyConversations);
      
      // Act
      await qaController.getConversations(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        conversations: []
      });
    });

    it('should handle single conversation', async () => {
      // Arrange
      const singleConversation: [string, any][] = [
        ['session-only', { sessionId: 'session-only', messageCount: 1 }]
      ];

      mockConversationService.getAll.mockReturnValue(singleConversation);
      
      // Act
      await qaController.getConversations(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        conversations: [
          { id: 'session-only', sessionId: 'session-only', messageCount: 1 }
        ]
      });
    });
  });
});