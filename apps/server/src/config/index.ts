import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

interface OllamaConfig {
  url: string;
  model: string;
  models: {
    translation: string;
    suggestion: string;
    intent: string;
    elaboration: string;
    vision: string;
  };
}

interface SessionConfig {
  secret: string;
  cookie: { maxAge: number };
}

interface GoogleSearchConfig {
  apiKey?: string;
  cx?: string;
}

interface VisionConfig {
  modelConfidenceThreshold: number;
  textConfidenceThreshold: number;
}

interface AppConfig {
  port: number;
  ollama: OllamaConfig;
  aiProvider: string;
  mode: string;
  isProduction: boolean;
  session: SessionConfig;
  googleSearch: GoogleSearchConfig;
  carouselImageLength: number;
  vision: VisionConfig;
}

/**
 * Environment-specific configuration loaders
 * These only provide additional defaults for specific environments
 * Environment variables always take precedence
 */
const loadEnvironmentConfig = (): Partial<AppConfig> => {
  const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        isProduction: true,
        mode: 'production'
      };
      
    case 'test':
      return {
        mode: 'test'
      };
      
    default: // development
      return {
        isProduction: false,
        mode: 'development'
      };
  }
};

/**
 * Load configuration with environment variables taking precedence
 */
export const config: AppConfig = {
  // Environment variables take precedence over defaults
  port: Number(process.env.PORT) || 3000,
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'ministral-3:3b',
    models: {
      translation: process.env.OLLAMA_MODEL_TRANSLATION || 'ministral-3:3b',
      suggestion: process.env.OLLAMA_MODEL_SUGGESTION || 'ministral-3:3b', 
      intent: process.env.OLLAMA_MODEL_INTENT || 'ministral-3:3b',
      elaboration: process.env.OLLAMA_MODEL_ELABORATION || 'ministral-3:3b',
      vision: process.env.OLLAMA_MODEL_VISION || 'ministral-3:3b'
    }
  },
  aiProvider: process.env.AI_PROVIDER || 'ollama',
  mode: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  isProduction: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
  session: {
    secret: process.env.SESSION_SECRET || 'cargpt-secret-key-change-in-production',
    cookie: { maxAge: 3600000 }
  },
  googleSearch: {
    apiKey: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_CX
  },
  carouselImageLength: Number(process.env.CAROUSEL_IMAGES_LENGHT) || 1,
  vision: {
    modelConfidenceThreshold: Number(process.env.VISION_MODEL_CONFIDENCE_THRESHOLD) || 0.8,
    textConfidenceThreshold: Number(process.env.VISION_TEXT_CONFIDENCE_THRESHOLD) || 0.2
  },
  
  // Environment-specific overrides
  ...loadEnvironmentConfig()
};

/**
 * Validates required configuration
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [];
  
  if (config.isProduction && config.session.secret === 'cargpt-secret-key-change-in-production') {
    requiredEnvVars.push('SESSION_SECRET');
  }
  
  if (!config.ollama.url) {
    requiredEnvVars.push('OLLAMA_URL');
  }
  
  if (requiredEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${requiredEnvVars.join(', ')}`);
  }
};

/**
 * Loads the swagger document from the filesystem.
 * @returns {Object} The JSON swagger document.
 */
export const loadSwaggerDocument = () => {
  try {
    return JSON.parse(readFileSync('./swagger.json', 'utf8'));
  } catch (error) {
    console.warn('Failed to load swagger document:', error);
    return {};
  }
};