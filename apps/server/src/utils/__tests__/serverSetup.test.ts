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
vi.mock('swagger-ui-express', () => ({
  default: {
    serve: vi.fn((req, res, next) => next()),
    setup: vi.fn(() => (req, res, next) => next())
  },
  serve: vi.fn((req, res, next) => next()),
  setup: vi.fn(() => (req, res, next) => next())
}));

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
      const calls = (app.use as any).mock.calls;
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
  });

  describe('setupGracefulShutdown', () => {
    it('should set up signal handlers', () => {
      setupGracefulShutdown(mockServer);
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });
});