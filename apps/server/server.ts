import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';

import { config, loadSwaggerDocument } from './src/config/index.js';
import { ollamaService } from './src/services/ollamaService.js';
import apiRoutes from './src/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: true,
  cookie: config.session.cookie
}));

// Swagger Documentation
const swaggerDocument = loadSwaggerDocument();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api', apiRoutes);

// Centralized Error Handler (Basic)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    debug: !config.isProduction ? err.message : undefined
  });
});

// Start Server
const startServer = async () => {
  const isOllamaReady = await ollamaService.verifyOllama();
  
  app.listen(config.port, () => {
    console.log(`
🚀 CarGPT server is running!
🌐 URL: http://localhost:${config.port}
📚 API Docs: http://localhost:${config.port}/api-docs
🤖 AI Model: ${config.ollama.model}
⚡ Status: ${isOllamaReady ? 'Ready' : 'Ollama not detected'}
    `);
  });
};

startServer();
