import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ollamaService } from '../ollamaService.js';
import { OllamaError } from '../../utils/AppError.js';

describe('ollamaService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('callOllama', () => {
    it('should return content on successful call', async () => {
      const mockResponse = {
        message: { content: '{"test": true}' },
        eval_count: 10,
        prompt_eval_count: 5
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const messages = [{ role: 'user', content: 'test' }];
      const result = await ollamaService.callOllama(messages);

      expect(result).toBe('{"test": true}');
      expect(fetch).toHaveBeenCalled();
    });

    it('should throw OllamaError if fetch fails', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const messages = [{ role: 'user', content: 'test' }];
      await expect(ollamaService.callOllama(messages)).rejects.toThrow(OllamaError);
    });

    it('should throw OllamaError if connection fails', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const messages = [{ role: 'user', content: 'test' }];
      await expect(ollamaService.callOllama(messages)).rejects.toThrow('Unable to connect to Ollama');
    });
  });

  describe('parseJsonResponse', () => {
    it('should parse valid JSON', () => {
      const json = '{"key": "value"}';
      expect(ollamaService.parseJsonResponse(json)).toEqual({ key: 'value' });
    });

    it('should clean markdown blocks', () => {
      const json = '```json\n{"key": "value"}\n```';
      expect(ollamaService.parseJsonResponse(json)).toEqual({ key: 'value' });
    });

    it('should extract JSON from surrounding text', () => {
      const json = 'Here is the data: {"key": "value"} Hope it helps!';
      expect(ollamaService.parseJsonResponse(json)).toEqual({ key: 'value' });
    });

    it('should throw error for invalid JSON', () => {
      const json = '{"key": "value"';
      expect(() => ollamaService.parseJsonResponse(json)).toThrow('Failed to parse JSON');
    });
  });

  describe('verifyOllama', () => {
    it('should return true if model exists', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'ministral-3:3b' }] })
      });

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(true);
    });

    it('should return false if model does not exist', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'other_model' }] })
      });

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(false);
    });

    it('should return false if fetch fails', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(false);
    });
  });

  describe('verifyImageContainsCar', () => {
    it('should return true if confidence thresholds are met', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8)
      });
      
      const spyCall = vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.9, "textConfidence": 0.1}');
      const spyParse = vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.9, textConfidence: 0.1 });

      const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
      expect(result).toBe(true);
      
      spyCall.mockRestore();
      spyParse.mockRestore();
    });

    it('should return false if model confidence is low', async () => {
        (fetch as any).mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8)
        });
        
        vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.1, "textConfidence": 0.1}');
        vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.1, textConfidence: 0.1 });
  
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false if text confidence is high', async () => {
        (fetch as any).mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8)
        });
        
        vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.9, "textConfidence": 0.9}');
        vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.9, textConfidence: 0.9 });
  
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false if fetch fails', async () => {
        (fetch as any).mockResolvedValue({ ok: false });
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false on error', async () => {
        (fetch as any).mockRejectedValue(new Error('Vision error'));
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });
  });
});
