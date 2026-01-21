import express from 'express';


import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';

import { config, loadSwaggerDocument } from './src/config/index.js';
import { ollamaService } from './src/services/ollamaService.js';
import apiRoutes from './src/routes/api.js';
import logger from './src/utils/logger.js';
import { 
  errorHandler, 
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler 
} from './src/middleware/errorHandler.js';
import { 
  requestLogger, 
  responseTimeMiddleware,
  requestIdMiddleware 
} from './src/middleware/requestLogger.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();

// Setup global error handlers
unhandledRejectionHandler();
uncaughtExceptionHandler();

// Middleware
app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(requestLogger);
app.use(cors());
app.use(express.json());
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: true,
  cookie: config.session.cookie
}));

// Swagger Documentation (Development only)

logger.info(`Server running in ${config.isProduction ? 'production' : 'development'} mode`);
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


// API Routes
app.use('/api', apiRoutes);

// Error Handling (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const startServer = async () => {
  const isOllamaReady = await ollamaService.verifyOllama();
  
  const server = app.listen(config.port, () => {
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
  });

  // Graceful shutdown
const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    
    // Close Ollama connections
    ollamaService.closeConnections();
    
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

startServer();
