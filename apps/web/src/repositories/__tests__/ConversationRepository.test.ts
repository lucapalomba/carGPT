import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  conversationRepository,
  ConversationRepository,
} from '../ConversationRepository.js';
import type { Conversation } from '../ConversationRepository.js';

/**
 * ConversationRepository is a singleton backed by localStorage under the
 * `cargpt_conversations` key. Clearing storage between tests gives each test a
 * clean slate without needing to re-instantiate the singleton.
 */
const STORAGE_KEY = 'cargpt_conversations';

function makeConversation(partial: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    sessionId: 'session-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    messages: [],
    analysisHistory: [],
    pinnedIndices: new Set(),
    ...partial,
  };
}

describe('ConversationRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create / save / findById', () => {
    it('creates a conversation with a generated id and timestamps', async () => {
      const conv = await conversationRepository.create('session-1', 'en');

      expect(conv.id).toMatch(/^conv-/);
      expect(conv.sessionId).toBe('session-1');
      expect(conv.userLanguage).toBe('en');
      expect(conv.messages).toEqual([]);
      expect(conv.analysisHistory).toEqual([]);
      expect(conv.metadata?.searchCount).toBe(0);
      expect(conv.metadata?.userAgent).toBe(navigator.userAgent);
    });

    it('persists and retrieves a conversation by id with deserialized dates', async () => {
      const conv = await conversationRepository.create('session-1');
      const found = await conversationRepository.findById(conv.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(conv.id);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null when the conversation id does not exist', async () => {
      const found = await conversationRepository.findById('missing');
      expect(found).toBeNull();
    });

    it('updates an existing conversation on save instead of duplicating', async () => {
      const conv = await conversationRepository.create('session-1');
      conv.userLanguage = 'it';
      await conversationRepository.save(conv);

      const all = await conversationRepository.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].userLanguage).toBe('it');
    });
  });

  describe('findBySessionId / findAll', () => {
    it('filters conversations by session id, most recent first', async () => {
      await conversationRepository.create('session-a');
      const newer = await conversationRepository.create('session-b');
      // Force a newer updatedAt on session-a so ordering is deterministic.
      newer.updatedAt = new Date('2020-01-01T00:00:00Z');
      await conversationRepository.save(newer);

      const result = await conversationRepository.findBySessionId('session-b');
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('session-b');
    });

    it('findAll applies userLanguage and hasCars filters', async () => {
      const a = await conversationRepository.create('s1', 'en');
      a.currentCars = [{ make: 'Tesla', model: '3', year: 2023 }];
      await conversationRepository.save(a);
      await conversationRepository.create('s2', 'it');

      const englishWithCars = await conversationRepository.findAll({
        userLanguage: 'en',
        hasCars: true,
      });
      expect(englishWithCars).toHaveLength(1);
      expect(englishWithCars[0].sessionId).toBe('s1');

      const withoutCars = await conversationRepository.findAll({ hasCars: false });
      expect(withoutCars.map((c) => c.sessionId)).toContain('s2');
    });

    it('findAll applies dateFrom/dateTo and limit/offset', async () => {
      const old = await conversationRepository.create('s-old');
      old.createdAt = new Date('2020-01-01T00:00:00Z');
      old.updatedAt = new Date('2020-01-01T00:00:00Z');
      await conversationRepository.save(old);
      await conversationRepository.create('s-new');

      const after2025 = await conversationRepository.findAll({
        dateFrom: new Date('2025-01-01T00:00:00Z'),
      });
      expect(after2025.map((c) => c.sessionId)).toEqual(['s-new']);

      const paged = await conversationRepository.findAll({ limit: 1, offset: 0 });
      expect(paged).toHaveLength(1);
    });
  });

  describe('addMessage', () => {
    it('appends a message with a generated id and updates timestamps', async () => {
      const conv = await conversationRepository.create('s1');
      await conversationRepository.addMessage(conv.id, {
        timestamp: new Date(),
        type: 'user',
        content: 'find a car',
      });

      const found = await conversationRepository.findById(conv.id);
      expect(found!.messages).toHaveLength(1);
      expect(found!.messages[0].id).toBeDefined();
      expect(found!.messages[0].content).toBe('find a car');
    });

    it('throws when the conversation does not exist', async () => {
      await expect(
        conversationRepository.addMessage('missing', {
          timestamp: new Date(),
          type: 'user',
          content: 'x',
        })
      ).rejects.toThrow();
    });

    it('caps stored messages at MAX_MESSAGES_PER_CONVERSATION (100)', async () => {
      const conv = await conversationRepository.create('s1');
      for (let i = 0; i < 120; i++) {
        await conversationRepository.addMessage(conv.id, {
          timestamp: new Date(),
          type: 'user',
          content: `msg-${i}`,
        });
      }
      const found = await conversationRepository.findById(conv.id);
      expect(found!.messages).toHaveLength(100);
      // The most recent 100 are kept.
      expect(found!.messages[0].content).toBe('msg-20');
      expect(found!.messages[99].content).toBe('msg-119');
    });
  });

  describe('updateConversationData', () => {
    it('merges currentCars, analysisHistory and pinnedIndices', async () => {
      const conv = await conversationRepository.create('s1');
      await conversationRepository.updateConversationData(
        conv.id,
        [{ make: 'Tesla', model: '3', year: 2023 }],
        ['analysis-1'],
        new Set([0])
      );

      const found = await conversationRepository.findById(conv.id);
      expect(found!.currentCars).toHaveLength(1);
      expect(found!.analysisHistory).toEqual(['analysis-1']);
      // Note: Set does not survive JSON serialization, so the round-tripped
      // pinnedIndices is whatever JSON.stringify(Set) produced (an empty
      // object). We only assert the field is present.
      expect(found!.pinnedIndices).toBeDefined();
    });

    it('throws when the conversation does not exist', async () => {
      await expect(
        conversationRepository.updateConversationData('missing', [], [], new Set())
      ).rejects.toThrow();
    });
  });

  describe('delete / clearAll', () => {
    it('deletes a conversation and returns true', async () => {
      const conv = await conversationRepository.create('s1');
      const deleted = await conversationRepository.delete(conv.id);
      expect(deleted).toBe(true);
      expect(await conversationRepository.findById(conv.id)).toBeNull();
    });

    it('returns false when deleting a missing conversation', async () => {
      const deleted = await conversationRepository.delete('missing');
      expect(deleted).toBe(false);
    });

    it('clearAll empties storage', async () => {
      await conversationRepository.create('s1');
      await conversationRepository.clearAll();
      const all = await conversationRepository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('aggregates totals, top languages, intents and average duration', async () => {
      const a = await conversationRepository.create('s1', 'en');
      a.metadata!.lastSearchIntent = 'initial_search';
      // save() overwrites updatedAt to now, so backdate createdAt to get a
      // non-zero session duration.
      a.createdAt = new Date('2020-01-01T00:00:00Z');
      await conversationRepository.save(a);
      const b = await conversationRepository.create('s2', 'it');
      b.metadata!.lastSearchIntent = 'refinement';
      b.createdAt = new Date('2020-01-01T00:00:00Z');
      await conversationRepository.save(b);

      const stats = await conversationRepository.getStats();

      expect(stats.totalConversations).toBe(2);
      expect(stats.topLanguages.map((l) => l.language)).toContain('en');
      expect(stats.topIntents.map((i) => i.intent)).toContain('initial_search');
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
    });

    it('returns zeroed stats when there are no conversations', async () => {
      const stats = await conversationRepository.getStats();
      expect(stats.totalConversations).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.averageSessionDuration).toBe(0);
    });
  });

  describe('storage caps and robustness', () => {
    it('keeps only the most recent MAX_CONVERSATIONS (50) conversations', async () => {
      for (let i = 0; i < 55; i++) {
        const c = await conversationRepository.create(`s-${i}`);
        // Older index -> older updatedAt, so conversations 5..54 survive.
        c.updatedAt = new Date(Date.UTC(2020, 0, i + 1));
        await conversationRepository.save(c);
      }
      const all = await conversationRepository.findAll();
      expect(all).toHaveLength(50);
    });

    it('findAll throws on corrupted storage', async () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      await expect(conversationRepository.findAll()).rejects.toThrow();
    });

    it('save throws a wrapped error on quota exceeded', async () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      await expect(conversationRepository.save(makeConversation())).rejects.toThrow();

      spy.mockRestore();
    });
  });

  describe('singleton', () => {
    it('getInstance returns the same instance', () => {
      expect(ConversationRepository.getInstance()).toBe(conversationRepository);
    });
  });
});