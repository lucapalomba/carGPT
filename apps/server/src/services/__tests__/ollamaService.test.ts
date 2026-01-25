import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaService } from '../ollamaService.js';
import { OllamaError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { PromptService } from '../promptService.js';

vi.mock('../promptService.js');
const mockPromptService = vi.mocked(new PromptService());

describe('OllamaService', () => {
  let ollamaService: OllamaService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(logger, 'info').mockImplementation(() => logger);
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    vi.spyOn(logger, 'debug').mockImplementation(() => logger);
    
    ollamaService = new OllamaService(mockPromptService);
  });

  describe('callOllama', () => {
    it('should return content on successful call', async () => {
      const mockResponse = {
        message: { content: '{"test": true}' },
        eval_count: 10,
        prompt_eval_count: 5
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as any);

      const messages = [{ role: 'user', content: 'test' }];
      const result = await ollamaService.callOllama(messages);

      expect(result).toBe('{"test": true}');
      expect(fetch).toHaveBeenCalled();
    });

    it('should throw OllamaError if fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      const messages = [{ role: 'user', content: 'test' }];
      await expect(ollamaService.callOllama(messages)).rejects.toThrow(OllamaError);
    });

    it('should throw OllamaError if connection fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const messages = [{ role: 'user', content: 'test' }];
      await expect(ollamaService.callOllama(messages)).rejects.toThrow('Unable to connect to Ollama');
    });

    it('should handle non-Error objects in catch block', async () => {
        vi.mocked(fetch).mockRejectedValue('String error');
        const messages = [{ role: 'user', content: 'test' }];
        await expect(ollamaService.callOllama(messages)).rejects.toThrow('Unable to connect to Ollama');
        expect(logger.error).not.toHaveBeenCalled(); // Generation handles it now
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
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: config.ollama.model }] })
      } as any);

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(true);
    });

    it('should return false if model does not exist', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'other_model' }] })
      } as any);

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(false);
    });

    it('should return false if fetch fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await ollamaService.verifyOllama();
      expect(result).toBe(false);
    });

    it('should handle non-Error catch objects', async () => {
        vi.mocked(fetch).mockRejectedValue('String error');
        const result = await ollamaService.verifyOllama();
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyImageContainsCar', () => {
    it('should return true if confidence thresholds are met', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8)
      } as any);
      
      const spyCall = vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.9, "textConfidence": 0.1}');
      const spyParse = vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.9, textConfidence: 0.1 });
      vi.mocked(mockPromptService.loadTemplate).mockReturnValue('template');

      const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
      expect(result).toBe(true);
      
      spyCall.mockRestore();
      spyParse.mockRestore();
    });

    it('should return false if model confidence is low', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8)
        } as any);
        
        vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.1, "textConfidence": 0.1}');
        vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.1, textConfidence: 0.1 });
        vi.mocked(mockPromptService.loadTemplate).mockReturnValue('template');
  
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false if text confidence is high', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8)
        } as any);
        
        vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{"modelConfidence": 0.9, "textConfidence": 0.9}');
        vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({ modelConfidence: 0.9, textConfidence: 0.9 });
        vi.mocked(mockPromptService.loadTemplate).mockReturnValue('template');
  
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false if fetch fails', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: false } as any);
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should return false on error', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Vision error'));
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
    });

    it('should handle non-Error objects in catch block', async () => {
        vi.mocked(fetch).mockRejectedValue('Vision string error');
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle empty LLM response by using default confidence scores', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8)
        } as any);
        
        vi.spyOn(ollamaService, 'callOllama').mockResolvedValue('{}');
        vi.spyOn(ollamaService, 'parseJsonResponse').mockReturnValue({});
        vi.mocked(mockPromptService.loadTemplate).mockReturnValue('template');
  
        const result = await ollamaService.verifyImageContainsCar('Toyota', 2020, 'http://img.jpg', {});
        expect(result).toBe(false); // 0 confidence < 0.8 threshold
    });
  });
});
