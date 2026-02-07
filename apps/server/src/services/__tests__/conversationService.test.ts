import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
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
});
