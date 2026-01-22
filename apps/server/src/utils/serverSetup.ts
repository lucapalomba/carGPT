import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config, loadSwaggerDocument } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Setup development-specific middleware and routes
 */
export const setupDevelopmentEnvironment = (app: express.Application) => {
  if (!config.isProduction) {
    const swaggerDocument = loadSwaggerDocument();
    
    app.use('/api-docs', 
      (req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.debug(`Accessing Swagger UI at ${req.originalUrl}`);
        next();
      },
      swaggerUi.serve, 
      swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: "CarGPT API Documentation"
      })
    );
  }
};

/**
 * Setup application routes
 */
export const setupRoutes = (app: express.Application) => {
  import('../routes/api.js').then(apiRoutes => {
    app.use('/api', apiRoutes.default);
    
    // Error handling (must be after routes)
    import('../middleware/errorHandler.js').then(({ 
      notFoundHandler, 
      errorHandler 
    }) => {
      app.use(notFoundHandler);
      app.use(errorHandler);
    });
  });
};

/**
 * Log server startup information
 */
export const logServerInfo = (isOllamaReady: boolean) => {
  logger.info('CarGPT server started successfully', {
    port: config.port,
    environment: config.mode,
    ollamaStatus: isOllamaReady ? 'Ready' : 'Not Detected',
    model: config.ollama.model
  });
  
  if (!config.isProduction) {
    logger.info(`
🚀 CarGPT server is running!
🌐 URL: http://localhost:${config.port}
📚 API Docs: http://localhost:${config.port}/api-docs
🤖 AI Model: ${config.ollama.model}
    `);
  }
};

/**
 * Setup graceful shutdown handlers
 */
export const setupGracefulShutdown = (server: any) => {
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    
    // Close Ollama connections
    import('../services/ollamaService.js').then(({ ollamaService }) => {
      ollamaService.closeConnections();
    });
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};