import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationService } from '../conversationService.js';

describe('ConversationService', () => {
  let conversationService: ConversationService;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    conversationService = new ConversationService();
  });

  it('should initialize a new conversation if it does not exist', () => {
    const conversation = conversationService.getOrInitialize(sessionId);

    expect(conversation).toBeDefined();
    expect(conversation.sessionId).toBe(sessionId);
    expect(conversation.history).toEqual([]);
    expect(conversation.createdAt).toBeInstanceOf(Date);
  });

  it('should return an existing conversation', () => {
    const first = conversationService.getOrInitialize(sessionId);
    first.requirements = 'family car';
    
    const second = conversationService.getOrInitialize(sessionId);
    
    expect(second).toBe(first);
    expect(second.requirements).toBe('family car');
  });

  it('should return undefined for a non-existent conversation', () => {
    const conversation = conversationService.get(sessionId);
    expect(conversation).toBeUndefined();
  });

  it('should delete a conversation', () => {
    conversationService.getOrInitialize(sessionId);
    expect(conversationService.get(sessionId)).toBeDefined();
    
    conversationService.delete(sessionId);
    expect(conversationService.get(sessionId)).toBeUndefined();
  });



  it('should return the correct count', () => {
    const initialCount = conversationService.count();
    conversationService.getOrInitialize('count-test');
    expect(conversationService.count()).toBe(initialCount + 1);
    conversationService.delete('count-test');
  });

  describe('stale conversation cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes conversations older than one hour on the cleanup interval', () => {
      const service = new ConversationService();
      const stale = service.getOrInitialize('stale');
      service.getOrInitialize('fresh');

      // Age the stale conversation beyond the 1-hour threshold
      stale.createdAt = new Date(Date.now() - 2 * 3600000);

      vi.advanceTimersByTime(3600000);

      expect(service.get('stale')).toBeUndefined();
      expect(service.get('fresh')).toBeDefined();
    });
  });
});
