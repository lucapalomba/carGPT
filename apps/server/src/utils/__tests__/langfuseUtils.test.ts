import { vi, describe, it, expect, beforeEach } from 'vitest';
import { flushLangfuse, forceFlushLangfuse } from '../langfuseUtils';
import langfuse from '../langfuse';
import logger from '../logger';

vi.mock('../langfuse', () => ({
  default: {
    shutdownAsync: vi.fn(),
    flushAsync: vi.fn(),
  },
}));

vi.mock('../logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('langfuseUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('flushLangfuse', () => {
    it('should call langfuse.shutdownAsync', async () => {
      await flushLangfuse();
      expect(langfuse.shutdownAsync).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith('Flushing Langfuse traces...');
      expect(logger.debug).toHaveBeenCalledWith('Langfuse traces flushed successfully');
    });

    it('should log an error if shutdownAsync fails', async () => {
      const error = new Error('Shutdown failed');
      (langfuse.shutdownAsync as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      await flushLangfuse();
      expect(logger.error).toHaveBeenCalledWith('Error flushing Langfuse traces:', error);
    });
  });

  describe('forceFlushLangfuse', () => {
    it('should call langfuse.flushAsync', async () => {
      await forceFlushLangfuse();
      expect(langfuse.flushAsync).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith('Langfuse traces force flushed');
    });

    it('should log an error if flushAsync fails', async () => {
      const error = new Error('Flush failed');
      (langfuse.flushAsync as ReturnType<typeof vi.fn>).mockRejectedValue(error);
      await forceFlushLangfuse();
      expect(logger.error).toHaveBeenCalledWith('Error force flushing Langfuse traces:', error);
    });
  });
});
