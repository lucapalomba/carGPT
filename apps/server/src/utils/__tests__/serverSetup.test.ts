import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { setupDevelopmentEnvironment, setupRoutes, logServerInfo, setupGracefulShutdown } from '../serverSetup.js';
import * as configModule from '../../config/index.js';
import logger from '../logger.js';

// Mock express
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
  };
  return {
    default: vi.fn(() => mockApp),
  };
});

// Mock swagger-ui-express
vi.mock('swagger-ui-express', () => {
  const passThrough = (req: unknown, res: unknown, next: () => void) => next();
  return {
    default: {
      serve: vi.fn(passThrough),
      setup: vi.fn(() => passThrough)
    },
    serve: vi.fn(passThrough),
    setup: vi.fn(() => passThrough)
  };
});

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    isProduction: false,
    port: 3000,
    mode: 'development',
    ollama: {
      model: 'test-model',
    },
  },
  loadSwaggerDocument: vi.fn(() => ({})),
}));

// Mock logger
vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock dynamic imports
vi.mock('../../routes/api.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../middleware/errorHandler.js', () => ({
  notFoundHandler: vi.fn(),
  errorHandler: vi.fn(),
}));

// Mock the DI container used by setupGracefulShutdown's dynamic import. This
// must be a top-level mock (not vi.doMock) so it is guaranteed to be in effect
// regardless of test execution order.
const mockCloseConnections = vi.fn();
vi.mock('../../container/index.js', () => ({
  container: {
    get: vi.fn(() => ({ closeConnections: mockCloseConnections })),
  },
}));

describe('serverSetup', () => {
  let app: any;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    mockServer = {
      close: vi.fn((cb) => cb()),
    };
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(process, 'on').mockImplementation(() => process as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupDevelopmentEnvironment', () => {
    it('should set up swagger-ui in development mode', () => {
      // Mock isProduction to false
      (configModule.config as any).isProduction = false;
      
      setupDevelopmentEnvironment(app);
      
      // The middleware function is the second argument
      expect(app.use).toHaveBeenCalledWith('/api-docs', expect.any(Function), expect.anything(), expect.anything());
    });

    it('should not set up swagger-ui in production mode', () => {
      (configModule.config as any).isProduction = true;
      
      setupDevelopmentEnvironment(app);
      
      // Check that /api-docs was NOT called
      const calls: unknown[][] = (app.use as any).mock.calls;
      const apiDocsCall = calls.find(call => call[0] === '/api-docs');
      expect(apiDocsCall).toBeUndefined();
    });
  });

  describe('setupRoutes', () => {
    it('should be defined', () => {
      expect(setupRoutes).toBeDefined();
    });

    it('should eventually call app.use', async () => {
      setupRoutes(app);
      
      // Give it time for the multiple then() calls
      await vi.waitFor(() => {
        if ((app.use as any).mock.calls.length === 0) {
          throw new Error('Not called yet');
        }
      }, { timeout: 1000 });
      
      expect(app.use).toHaveBeenCalled();
    });
  });

  describe('logServerInfo', () => {
    it('should log server info', () => {
      logServerInfo(true);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should log the startup banner in development', () => {
      (configModule.config as any).isProduction = false;
      logServerInfo(false);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CarGPT server is running'));
    });

    it('should not log the banner in production', () => {
      (configModule.config as any).isProduction = true;
      (logger.info as any).mockClear();
      logServerInfo(true);
      const bannerCalls = (logger.info as any).mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('CarGPT server is running')
      );
      expect(bannerCalls).toHaveLength(0);
    });
  });

  describe('setupGracefulShutdown', () => {
    it('should set up signal handlers', () => {
      setupGracefulShutdown(mockServer);
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should log, close the server and exit when a signal is received', async () => {
      mockCloseConnections.mockClear();
      setupGracefulShutdown(mockServer);

      // Capture the SIGTERM handler registered by setupGracefulShutdown
      const sigtermCall = (process.on as any).mock.calls.find(
        (call: unknown[]) => call[0] === 'SIGTERM'
      );
      const handler = sigtermCall[1] as (signal: string) => void;
      await handler('SIGTERM');

      // Wait for the fire-and-forget dynamic import chain to settle so it does
      // not resolve after the test environment is torn down.
      await vi.waitFor(() => expect(mockCloseConnections).toHaveBeenCalled(), { timeout: 1000 });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('SIGTERM received')
      );
      expect(mockServer.close).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should force exit when the server does not close in time', async () => {
      vi.useFakeTimers();
      const hangingServer = { close: vi.fn() };
      setupGracefulShutdown(hangingServer);

      const sigintCall = (process.on as any).mock.calls.filter(
        (call: unknown[]) => call[0] === 'SIGINT'
      ).pop();
      const handler = sigintCall[1] as (signal: string) => void;
      handler('SIGINT');

      // Flush the dynamic import chain before advancing the force-shutdown timer
      await vi.runAllTicks();
      await Promise.resolve();
      await Promise.resolve();

      vi.advanceTimersByTime(10000);
      expect(process.exit).toHaveBeenCalledWith(1);
      vi.useRealTimers();
    });
  });
});