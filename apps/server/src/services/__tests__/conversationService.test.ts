import { describe, it, expect, beforeEach } from 'vitest';
import { conversationService } from '../conversationService.js';

describe('conversationService', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
    // Clean up before each test
    conversationService.delete(sessionId);
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

  it('should return all conversations', () => {
    const session1 = 's1';
    const session2 = 's2';
    conversationService.getOrInitialize(session1);
    conversationService.getOrInitialize(session2);
    
    const all = conversationService.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some(([id]) => id === session1)).toBe(true);
    expect(all.some(([id]) => id === session2)).toBe(true);
    
    conversationService.delete(session1);
    conversationService.delete(session2);
  });

  it('should return the correct count', () => {
    const initialCount = conversationService.count();
    conversationService.getOrInitialize('count-test');
    expect(conversationService.count()).toBe(initialCount + 1);
    conversationService.delete('count-test');
  });
});
