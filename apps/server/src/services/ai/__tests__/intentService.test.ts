import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intentService } from '../intentService.js';
import { ollamaService } from '../../ollamaService.js';
import { promptService } from '../../promptService.js';

vi.mock('../../ollamaService.js', () => ({
  ollamaService: {
    callOllama: vi.fn(),
    parseJsonResponse: vi.fn(),
    verifyOllama: vi.fn(),
    verifyImageContainsCar: vi.fn()
  }
}));
vi.mock('../../promptService.js');

describe('intentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('determineSearchIntent', () => {
    it('should throw error if determination fails', async () => {
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockImplementation(async () => {
             throw new Error('Intent error');
        });
        await expect(intentService.determineSearchIntent('context', 'en', { span: vi.fn().mockReturnValue({ end: vi.fn() }) })).rejects.toThrow('Intent error');
    });

    it('should determine intent successfully', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockResolvedValue('{"intent": "search"}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({ intent: "search" });

        const result = await intentService.determineSearchIntent('requirements', 'en', mockTrace);
        
        expect(result).toEqual({ intent: "search" });
        expect(ollamaService.callOllama).toHaveBeenCalled();
    });
  });
});
