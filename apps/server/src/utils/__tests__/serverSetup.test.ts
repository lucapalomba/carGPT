import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logServerInfo } from '../serverSetup.js';
import { config } from '../../config/index.js';
import logger from '../logger.js';

// Mock dependencies
vi.mock('../../config/index.js');
vi.mock('../logger.js');

describe('serverSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset config module entirely
    vi.resetModules();
    
    // Mock config values
    vi.mocked(config).port = 3000;
    vi.mocked(config).mode = 'development';
    vi.mocked(config).isProduction = false;
    vi.mocked(config).ollama = { 
      model: 'llama2', 
      url: 'http://localhost:11434'
    } as any;
  });

  describe('logServerInfo', () => {
    it('should log server info in production mode', () => {
      // Clear all mocks and setup fresh state
      vi.clearAllMocks();
      
      // Ensure config.isProduction is true for this test
      Object.defineProperty(config, 'isProduction', { value: true, writable: true });
      Object.defineProperty(config, 'mode', { value: 'production', writable: true });

      logServerInfo(true);

      expect(logger.info).toHaveBeenCalledWith('CarGPT server started successfully', {
        port: 3000,
        environment: 'production',
        ollamaStatus: 'Ready',
        model: 'llama2'
      });
    });

    it('should log server info with development banner', () => {
      vi.mocked(config).isProduction = false;

      logServerInfo(false);

      expect(logger.info).toHaveBeenCalledWith('CarGPT server started successfully', {
        port: 3000,
        environment: 'development',
        ollamaStatus: 'Not Detected',
        model: 'llama2'
      });

      // Check that development banner was logged
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🚀 CarGPT server is running!'));
    });

    it('should handle different ollama statuses', () => {
      logServerInfo(true);
      expect(logger.info).toHaveBeenCalledWith(
        'CarGPT server started successfully',
        expect.objectContaining({ ollamaStatus: 'Ready' })
      );

      logServerInfo(false);
      expect(logger.info).toHaveBeenCalledWith(
        'CarGPT server started successfully',
        expect.objectContaining({ ollamaStatus: 'Not Detected' })
      );
    });

    it('should include correct URL in development banner', () => {
      vi.mocked(config).isProduction = false;
      vi.mocked(config).port = 8080;

      logServerInfo(false);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('http://localhost:8080'));
    });

    it('should include correct API docs URL in development banner', () => {
      vi.mocked(config).isProduction = false;
      vi.mocked(config).port = 3000;

      logServerInfo(false);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/api-docs'));
    });

    it('should include correct AI model in development banner', () => {
      vi.mocked(config).isProduction = false;
      vi.mocked(config).ollama.model = 'gpt4';

      logServerInfo(false);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('AI Model: gpt4'));
    });

    it('should not show development banner in production', () => {
      vi.mocked(config).isProduction = true;

      logServerInfo(true);

      // Should not contain development banner elements
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('🚀 CarGPT server is running!'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('🌐 URL:'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('📚 API Docs:'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('🤖 AI Model:'));
    });
  });

  describe('setupRoutes', () => {
    it('should mount API routes', async () => {
      const { setupRoutes } = await import('../serverSetup.js');
      const mockApp = { use: vi.fn() } as any;
      
      setupRoutes(mockApp);
      
      // Since it's an async import inside setupRoutes, we wait a bit or use vi.waitFor
      await vi.waitFor(() => {
        expect(mockApp.use).toHaveBeenCalledWith('/api', expect.anything());
      });
    });
  });

  describe('setupGracefulShutdown', () => {
    it('should register signal handlers', async () => {
      const { setupGracefulShutdown } = await import('../serverSetup.js');
      const mockServer = { close: vi.fn() };
      const processOnSpy = vi.spyOn(process, 'on');
      
      setupGracefulShutdown(mockServer);
      
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });
});