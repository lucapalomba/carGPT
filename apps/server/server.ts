import express from 'express';
import session from 'express-session';
import cors from 'cors';

import { config, validateConfig } from './src/config/index.js';
// Services will be injected via DI container
import logger from './src/utils/logger.js';
import { 
  unhandledRejectionHandler,
  uncaughtExceptionHandler 
} from './src/middleware/errorHandler.js';
import { 
  requestLogger, 
  responseTimeMiddleware,
  requestIdMiddleware 
} from './src/middleware/requestLogger.js';
import { 
  setupDevelopmentEnvironment,
  setupRoutes,
  logServerInfo,
  setupGracefulShutdown
} from './src/utils/serverSetup.js';
import { 
  setupDevelopmentFeatures,
  setupProductionFeatures,
  getSessionConfig,
  getCorsConfig
} from './src/config/environment.js';
import { container, registerDependencies } from './src/container/index.js';
import { SERVICE_IDENTIFIERS, IOllamaService } from './src/container/interfaces.js';

// Validate configuration on startup
validateConfig();

// Register all dependencies
registerDependencies();

const app = express();

// Setup global error handlers
unhandledRejectionHandler();
uncaughtExceptionHandler();

// Apply environment-specific features
setupDevelopmentFeatures();
setupProductionFeatures();

// Apply middleware with environment-specific configuration
const sessionConfig = getSessionConfig();

// Core middleware stack
app.use([
  requestIdMiddleware,
  responseTimeMiddleware,
  requestLogger,
  cors(getCorsConfig()),
  express.json(),
  session({
    secret: sessionConfig.secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      ...sessionConfig.cookie,
      secure: config.isProduction
    }
  })
]);

// Setup environment-specific features
setupDevelopmentEnvironment(app);

// Setup routes
setupRoutes(app);

// Start Server
const startServer = async () => {
  const ollamaService = container.get<IOllamaService>(SERVICE_IDENTIFIERS.OLLAMA_SERVICE);
  const isOllamaReady = await ollamaService.verifyOllama();
  
  const server = app.listen(config.port, () => {
    logServerInfo(isOllamaReady);
  });

  // Setup graceful shutdown
  setupGracefulShutdown(server);
};

startServer();
