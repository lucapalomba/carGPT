import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

const TestSchema = z.object({ test: z.boolean() });

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({ default: mockLogger }));

const mockGeneration = vi.hoisted(() => vi.fn());
vi.mock('../../utils/langfuse.js', () => ({
  default: { generation: mockGeneration, trace: vi.fn() },
  langfuse: { generation: mockGeneration, trace: vi.fn() },
}));

vi.mock('../../utils/langfuseUtils.js', () => ({
  forceFlushLangfuse: vi.fn().mockResolvedValue(undefined),
}));

import { OllamaService } from '../ollamaService.js';
import { config } from '../../config/index.js';

const buildService = () => {
  const promptService = { loadTemplate: vi.fn().mockReturnValue('template for {carInfo}') } as any;
  return new OllamaService(promptService);
};

describe('OllamaService extra coverage', () => {
  // Deep copy so nested objects (models, etc.) are restored too.
  const originalCloud = structuredClone(config.ollama);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    Object.assign(config.ollama, structuredClone(originalCloud));
  });

  afterEach(() => {
    Object.assign(config.ollama, structuredClone(originalCloud));
    vi.unstubAllGlobals();
  });

  describe('convenience wrappers', () => {
    it('analyzeIntent delegates to callOllamaStructured with a model override', async () => {
      const service = buildService();
      const spy = vi.spyOn(service, 'callOllamaStructured').mockResolvedValue({ ok: true });

      await service.analyzeIntent('find a car', undefined, 'custom-model');

      expect(spy).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Analyze the user intent: find a car' }],
        expect.anything(),
        undefined,
        'intent_analysis',
        'custom-model'
      );
    });

    it('generateSuggestions, elaborateContent and evaluateDecision forward their inputs', async () => {
      const service = buildService();
      const spy = vi.spyOn(service, 'callOllamaStructured').mockResolvedValue({ ok: true });

      await service.generateSuggestions('ctx');
      await service.elaborateContent('summary', 'ctx');
      await service.evaluateDecision({ a: 1 }, { c: 2 });

      expect(spy).toHaveBeenNthCalledWith(1, expect.any(Array), expect.anything(), undefined, 'suggestion_generation', undefined);
      expect(spy).toHaveBeenNthCalledWith(2, expect.any(Array), expect.anything(), undefined, 'content_elaboration', undefined);
      expect(spy).toHaveBeenNthCalledWith(3, expect.any(Array), expect.anything(), undefined, 'decision_evaluation', undefined);
    });
  });

  describe('cloud configuration', () => {
    it('returns true when cloud is disabled', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = false;

      await expect(service.verifyCloudConfiguration()).resolves.toBe(true);
    });

    it('returns false when the cloud api key is missing', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = undefined;
      config.ollama.cloudUrl = 'https://cloud.example.com';

      await expect(service.verifyCloudConfiguration()).resolves.toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('returns false when the cloud url is missing', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = 'key';
      config.ollama.cloudUrl = undefined;

      await expect(service.verifyCloudConfiguration()).resolves.toBe(false);
    });

    it('uses cloud headers and returns response.ok for a configured cloud', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = 'secret';
      config.ollama.cloudUrl = 'https://cloud.example.com';
      vi.mocked(fetch).mockResolvedValue({ ok: true } as any);

      await expect(service.verifyCloudConfiguration()).resolves.toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://cloud.example.com/api/tags',
        expect.objectContaining({ headers: { Authorization: 'Bearer secret' } })
      );
    });

    it('returns false when the cloud request throws', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = 'secret';
      config.ollama.cloudUrl = 'https://cloud.example.com';
      vi.mocked(fetch).mockRejectedValue(new Error('network'));

      await expect(service.verifyCloudConfiguration()).resolves.toBe(false);
    });

    it('routes structured calls through the cloud endpoint when enabled', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = 'secret';
      config.ollama.cloudUrl = 'https://cloud.example.com';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '{"test": true}' } }),
      } as any);

      await service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, undefined, 'op');

      const [url, options] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe('https://cloud.example.com/api/chat');
      expect((options as any).headers.Authorization).toBe('Bearer secret');
    });
  });

  describe('callOllamaStructured option parsing', () => {
    it('throws an OllamaError when OLLAMA_OPTIONS is invalid JSON', async () => {
      const service = buildService();
      config.ollama.options = 'not-json';

      await expect(
        service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema)
      ).rejects.toThrow('Ollama API no configuration');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('connection pool lifecycle', () => {
    it('closeConnections aborts and clears active operations', async () => {
      const service = buildService();
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

      // Kick off a request without awaiting it so a connection stays active
      service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, undefined, 'slow');
      await Promise.resolve();

      expect(() => service.closeConnections()).not.toThrow();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('waits for a free slot once the pool is saturated, then proceeds', async () => {
      const service = buildService();
      let call = 0;
      vi.mocked(fetch).mockImplementation(() => {
        call++;
        if (call <= 5) return new Promise(() => {});
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: { content: '{"test": true}' } }),
        } as any);
      });

      // Saturate the pool (max 5) with hung requests
      for (let i = 0; i < 5; i++) {
        service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, undefined, `hang-${i}`);
      }
      await Promise.resolve();

      // A 6th request must wait for a free connection; closing the pool resets
      // activeConnections so the waiter can proceed.
      const sixth = service.callOllamaStructured(
        [{ role: 'user', content: 'hi' }],
        TestSchema,
        undefined,
        'waiter'
      );

      await new Promise(resolve => setTimeout(resolve, 250));
      service.closeConnections();

      await expect(sixth).resolves.toEqual({ test: true });
    });
  });

  describe('parseJsonResponse', () => {
    it('parses bare arrays and fenced blocks without a language tag', async () => {
      const service = buildService();
      expect(service.parseJsonResponse('```\n[1,2,3]\n```')).toEqual([1, 2, 3]);
      expect(service.parseJsonResponse('[{"a":1}]')).toEqual([{ a: 1 }]);
    });
  });

  describe('model and operation routing', () => {
    it('routes vision operations to the vision model', async () => {
      const service = buildService();
      config.ollama.models.vision = 'vision-model';
      config.ollama.model = 'default-model';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '{"test": true}' } }),
      } as any);

      await service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, undefined, 'image_analysis');

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
      expect(body.model).toBe('vision-model');
    });

    it.each([
      ['translate_car', 'translation'],
      ['intent_check', 'intent_determination'],
      ['suggestion_pass', 'suggestion_generation'],
      ['elaborate_now', 'car_elaboration'],
      ['vision_pass', 'image_verification'],
      ['unknown_op', 'general'],
    ])('maps operation "%s" to type "%s"', async (operationName, expectedType) => {
      const service = buildService();
      mockGeneration.mockClear();
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '{"test": true}' }, usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }),
      } as any);

      await service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, { id: 't' }, operationName);

      // getOperationType is only observable through the Langfuse generation metadata
      expect(mockGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ operationType: expectedType })
        })
      );
    });

    it('prefers an explicit model override', async () => {
      const service = buildService();
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '{"test": true}' } }),
      } as any);

      await service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema, undefined, 'op', 'override-model');

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
      expect(body.model).toBe('override-model');
    });
  });

  describe('verifyOllama cloud branches', () => {
    it('queries the cloud tags endpoint and matches by partial name', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudApiKey = 'secret';
      config.ollama.cloudUrl = 'https://cloud.example.com';
      config.ollama.model = 'llama';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'family/llama:latest' }] }),
      } as any);

      await expect(service.verifyOllama()).resolves.toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://cloud.example.com/api/tags',
        expect.objectContaining({ headers: { Authorization: 'Bearer secret' } })
      );
    });

    it('returns false when the cloud tags endpoint is not ok', async () => {
      const service = buildService();
      config.ollama.cloudEnabled = true;
      config.ollama.cloudUrl = 'https://cloud.example.com';
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as any);

      await expect(service.verifyOllama()).resolves.toBe(false);
    });
  });

  describe('error response handling', () => {
    it('tolerates an unreadable error body', async () => {
      const service = buildService();
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => {
          throw new Error('cannot read');
        },
      } as any);

      await expect(
        service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema)
      ).rejects.toThrow('Unable to read error response body');
    });

    it('still returns the result when the Langfuse flush fails', async () => {
      const service = buildService();
      const langfuseUtils = await import('../../utils/langfuseUtils.js');
      vi.mocked(langfuseUtils.forceFlushLangfuse).mockRejectedValueOnce(new Error('flush failed'));
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: '{"test": true}' } }),
      } as any);

      await expect(
        service.callOllamaStructured([{ role: 'user', content: 'hi' }], TestSchema)
      ).resolves.toEqual({ test: true });
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to force flush Langfuse traces:', expect.any(Error));
    });
  });
});
