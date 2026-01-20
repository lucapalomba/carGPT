import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestionService } from '../suggestionService.js';
import { ollamaService } from '../../ollamaService.js';
import { promptService } from '../../promptService.js';

vi.mock('../../ollamaService.js');
vi.mock('../../promptService.js');

describe('suggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCarSuggestions', () => {
    it('should throw error if suggestion fails', async () => {
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Suggestion error'));
        await expect(suggestionService.getCarSuggestions({}, 'context', '', { span: vi.fn().mockReturnValue({ end: vi.fn() }) })).rejects.toThrow('Suggestion error');
    });

    it('should get suggestions successfully', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockResolvedValue('{"choices": []}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({ choices: [] });

        const result = await suggestionService.getCarSuggestions({}, 'context', '', mockTrace);
        
        expect(result).toEqual({ choices: [] });
    });
  });
});
