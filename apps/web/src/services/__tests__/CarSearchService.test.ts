import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API client and the conversation repository before importing the
// service under test.
vi.mock('../../utils/api.js', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../repositories/ConversationRepository.js', () => ({
  conversationRepository: {
    findBySessionId: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'conv-1' }),
    addMessage: vi.fn().mockResolvedValue(undefined),
    updateConversationData: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

import { api } from '../../utils/api.js';
import { conversationRepository } from '../../repositories/ConversationRepository.js';
import { CarSearchService } from '../CarSearchService.js';
import type { Car } from '../../hooks/useCarSearch.js';

const apiPost = api.post as unknown as ReturnType<typeof vi.fn>;

describe('CarSearchService', () => {
  let service: CarSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = CarSearchService.getInstance();
    // Re-establish default resolved value after clearAllMocks.
    (conversationRepository.findBySessionId as any).mockResolvedValue([]);
    (conversationRepository.create as any).mockResolvedValue({ id: 'conv-1' });
    (conversationRepository.addMessage as any).mockResolvedValue(undefined);
    (conversationRepository.updateConversationData as any).mockResolvedValue(undefined);
  });

  describe('singleton', () => {
    it('getInstance returns a single shared instance', () => {
      const a = CarSearchService.getInstance();
      const b = CarSearchService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('validateSearchRequirements', () => {
    it('rejects null/undefined and non-strings', () => {
      expect(service.validateSearchRequirements(null as any)).toBe(false);
      expect(service.validateSearchRequirements(undefined as any)).toBe(false);
      expect(service.validateSearchRequirements(123 as any)).toBe(false);
    });

    it('rejects empty or too-short input (<3 chars)', () => {
      expect(service.validateSearchRequirements('')).toBe(false);
      expect(service.validateSearchRequirements('  ')).toBe(false);
      expect(service.validateSearchRequirements('ab')).toBe(false);
    });

    it('rejects input over 1000 characters', () => {
      expect(service.validateSearchRequirements('a'.repeat(1001))).toBe(false);
    });

    it('accepts valid input between 3 and 1000 characters', () => {
      expect(service.validateSearchRequirements('I need a car')).toBe(true);
      expect(service.validateSearchRequirements('a'.repeat(1000))).toBe(true);
    });
  });

  describe('validateFeedback', () => {
    it('rejects null/undefined and non-strings', () => {
      expect(service.validateFeedback(null as any)).toBe(false);
      expect(service.validateFeedback(undefined as any)).toBe(false);
    });

    it('rejects feedback shorter than 3 or longer than 500 characters', () => {
      expect(service.validateFeedback('ab')).toBe(false);
      expect(service.validateFeedback('a'.repeat(501))).toBe(false);
    });

    it('accepts feedback within 3-500 characters', () => {
      expect(service.validateFeedback('cheaper please')).toBe(true);
      expect(service.validateFeedback('a'.repeat(500))).toBe(true);
    });
  });

  describe('extractCarInfo', () => {
    it('returns null for empty input', () => {
      expect(service.extractCarInfo('')).toBeNull();
      expect(service.extractCarInfo(null as any)).toBeNull();
    });

    it('extracts a known brand and the following word as model', () => {
      const result = service.extractCarInfo('I want a Tesla Model 3 please');
      expect(result).toEqual({ make: 'Tesla', model: 'Model' });
    });

    it('extracts a brand with no following model word', () => {
      const result = service.extractCarInfo('Looking for a BMW');
      expect(result).toEqual({ make: 'Bmw', model: undefined });
    });

    it('handles multi-word brands like "land rover"', () => {
      const result = service.extractCarInfo('a land rover discovery would be nice');
      expect(result?.make).toBe('Land rover');
    });

    it('returns null when no known brand is present', () => {
      expect(service.extractCarInfo('I want something cheap and small')).toBeNull();
    });
  });

  describe('formatCarDisplay', () => {
    it('formats make, model and year when all present', () => {
      expect(service.formatCarDisplay({ make: 'Tesla', model: '3', year: 2023 } as Car)).toBe(
        '2023 Tesla 3'
      );
    });

    it('omits the year when missing', () => {
      expect(service.formatCarDisplay({ make: 'Tesla', model: '3' } as Car)).toBe('Tesla 3');
    });

    it('falls back to Unknown for missing make/model', () => {
      expect(service.formatCarDisplay({} as Car)).toBe('Unknown Unknown');
      expect(service.formatCarDisplay(null as any)).toBe('Unknown Car');
    });
  });

  describe('findCars', () => {
    it('logs messages and returns data on success', async () => {
      const cars: Car[] = [{ make: 'Tesla', model: '3', year: 2023 } as Car];
      apiPost.mockResolvedValue({ success: true, cars, analysis: 'analysis' });

      const result = await service.findCars('I need a car', 'session-1');

      expect(result).toEqual({ success: true, cars, analysis: 'analysis' });
      // user message + assistant message logged
      expect(conversationRepository.addMessage).toHaveBeenCalledTimes(2);
      expect(apiPost).toHaveBeenCalledWith('/api/find-cars', { requirements: 'I need a car' });
    });

    it('throws a wrapped error when the API call fails', async () => {
      apiPost.mockRejectedValue(new Error('boom'));

      await expect(service.findCars('I need a car', 'session-1')).rejects.toThrow(
        /Failed to search for cars/
      );
    });
  });

  describe('refineSearch', () => {
    it('posts feedback and pinnedCars, returns data', async () => {
      const pinned: Car[] = [{ make: 'Tesla', model: '3', year: 2023 } as Car];
      apiPost.mockResolvedValue({ success: true, cars: pinned, analysis: 'refined' });

      const result = await service.refineSearch('cheaper', pinned, 'session-1');

      expect(result).toEqual({ success: true, cars: pinned, analysis: 'refined' });
      expect(apiPost).toHaveBeenCalledWith('/api/refine-search', { feedback: 'cheaper', pinnedCars: pinned });
    });

    it('works without a sessionId (no conversation logging)', async () => {
      apiPost.mockResolvedValue({ success: true, cars: [], analysis: 'a' });

      const result = await service.refineSearch('cheaper');
      expect(result).not.toBeNull();
      expect(conversationRepository.addMessage).not.toHaveBeenCalled();
    });

    it('throws a wrapped error when the API call fails', async () => {
      apiPost.mockRejectedValue(new Error('boom'));

      await expect(service.refineSearch('cheaper', [], 'session-1')).rejects.toThrow(
        /Failed to refine search results/
      );
    });
  });

  describe('resetConversation', () => {
    it('posts to reset-conversation and deletes conversations when a sessionId is given', async () => {
      apiPost.mockResolvedValue({ success: true });
      (conversationRepository.findBySessionId as any).mockResolvedValue([{ id: 'conv-1' }]);

      await service.resetConversation('session-1');

      expect(apiPost).toHaveBeenCalledWith('/api/reset-conversation', {});
      expect(conversationRepository.delete).toHaveBeenCalledWith('conv-1');
    });

    it('throws a wrapped error when the API call fails', async () => {
      apiPost.mockRejectedValue(new Error('boom'));

      await expect(service.resetConversation()).rejects.toThrow(
        /Failed to reset conversation/
      );
    });
  });

  describe('updateConversationData', () => {
    it('delegates to the repository and does not throw on error', async () => {
      (conversationRepository.updateConversationData as any).mockRejectedValue(new Error('x'));

      // Should not throw — updateConversationData swallows repository errors.
      await expect(
        service.updateConversationData('session-1', [], [], new Set())
      ).resolves.toBeUndefined();
    });
  });
});