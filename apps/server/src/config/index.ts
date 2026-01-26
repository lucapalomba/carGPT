import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables from current directory or root
dotenv.config();

// If some essential variables are missing, try loading from root
if (!process.env.GOOGLE_API_KEY && !process.env.SESSION_SECRET) {
  dotenv.config({ path: '../../.env' });
}

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
 * Validates required configuration and catches placeholder values
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [];
  const placeholderVars = [];
  
  // Check for missing variables
  if (config.isProduction && config.session.secret === 'cargpt-secret-key-change-in-production') {
    requiredEnvVars.push('SESSION_SECRET');
  }
  
  if (!config.ollama.url) {
    requiredEnvVars.push('OLLAMA_URL');
  }
  
  // Check for placeholder values
  if (config.googleSearch.apiKey === 'placeholder') {
    placeholderVars.push('GOOGLE_API_KEY');
  }
  
  if (config.googleSearch.cx === 'placeholder') {
    placeholderVars.push('GOOGLE_CX');
  }
  
  if (process.env.LANGFUSE_PUBLIC_KEY === 'pk-lf-placeholder') {
    placeholderVars.push('LANGFUSE_PUBLIC_KEY');
  }
  
  if (process.env.LANGFUSE_SECRET_KEY === 'sk-lf-placeholder') {
    placeholderVars.push('LANGFUSE_SECRET_KEY');
  }
  
  // Report missing variables
  if (requiredEnvVars.length > 0) {
    throw new Error(`❌ Missing required environment variables: ${requiredEnvVars.join(', ')}`);
  }
  
  // Report placeholder values
  if (placeholderVars.length > 0) {
    throw new Error(`⚠️  Environment variables have placeholder values: ${placeholderVars.join(', ')}. Please set actual values in .env file.`);
  }
  
  // Log successful configuration
  console.log('✅ Configuration validation passed');
  console.log(`🔑 Google API Key: ${config.googleSearch.apiKey ? 'Set' : 'Missing'}`);
  console.log(`🔍 Google CX: ${config.googleSearch.cx ? 'Set' : 'Missing'}`);
  console.log(`📊 Langfuse: ${process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_PUBLIC_KEY !== 'pk-lf-placeholder' ? 'Enabled' : 'Missing/Placeholder'}`);
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