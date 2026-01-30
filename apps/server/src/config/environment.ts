import { config } from '../config/index.js';

/**
 * Development-specific setup
 */
export const setupDevelopmentFeatures = () => {
  if (!config.isProduction) {
    console.info(`
   - Swagger docs available at /api-docs
   - Debug logging enabled
   - Hot reload active
    `);
  }
};

/**
 * Production-specific setup
 */
export const setupProductionFeatures = () => {
  if (config.isProduction) {
    console.info(`
🏭 Production mode detected:
   - Optimizations enabled
   - Debug features disabled
   - Security features active
    `);
  }
};

/**
 * Environment-specific logging configuration
 */
export const configureLogging = () => {
  const logLevel = config.isProduction ? 'info' : 'debug';
  return { level: logLevel };
};

/**
 * Session configuration based on environment
 */
export const getSessionConfig = () => {
  const baseConfig = config.session;
  
  if (config.isProduction) {
    return {
      secret: baseConfig.secret,
      cookie: {
        ...baseConfig.cookie,
        secure: true,
        httpOnly: true
      }
    };
  }
  
  return baseConfig;
};

/**
 * CORS configuration based on environment
 */
export const getCorsConfig = () => {
  if (config.isProduction) {
    return {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    };
  }
  
  return {
    origin: true,
    credentials: true
  };
};