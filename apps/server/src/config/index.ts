import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

interface OllamaConfig {
  url: string;
  model: string;
  cloudEnabled: boolean;
  cloudUrl?: string;
  cloudApiKey?: string;
  options?: string; // JSON string of options object
  models: {
    translation: string;
    suggestion: string;
    intent: string;
    elaboration: string;
    vision: string;
  };
}



interface GoogleSearchConfig {
  apiKey?: string;
  cx?: string;
}

interface VisionConfig {
  modelConfidenceThreshold: number;
  textConfidenceThreshold: number;
}

interface RateLimitConfig {
  enabled: boolean;
  global: {
    windowMs: number;
    max: number;
  };
  findCars: {
    windowMs: number;
    max: number;
  };
  compareCars: {
    windowMs: number;
    max: number;
  };
  askAboutCar: {
    windowMs: number;
    max: number;
  };
  getAlternatives: {
    windowMs: number;
    max: number;
  };
  refineSearch: {
    windowMs: number;
    max: number;
  };
  health: {
    windowMs: number;
    max: number;
  };
  conversation: {
    windowMs: number;
    max: number;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
    maxDelayMs: number;
  };
  ollamaQueue: {
    concurrency: number;
    timeout: number;
    maxQueueSize: number;
  };
}

interface AppConfig {
  port: number;
  ollama: OllamaConfig;
  aiProvider: string;
  mode: string;
  isProduction: boolean;

  googleSearch: GoogleSearchConfig;
  carouselImageLength: number;
  maxInterestingPropertiesCount: number;
  vision: VisionConfig;
  sequentialPromiseExecution: boolean;
  aiRetryCount: number;
  rateLimit: RateLimitConfig;
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
    cloudEnabled: process.env.OLLAMA_CLOUD_ENABLED === 'true',
    cloudUrl: process.env.OLLAMA_CLOUD_URL,
    cloudApiKey: process.env.OLLAMA_CLOUD_API_KEY,
    options: process.env.OLLAMA_OPTIONS || '{"temperature": 0, "num_predict": 100000, "top_p": 1, "top_k": 5}',
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

  googleSearch: {
    apiKey: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_CX
  },
carouselImageLength: process.env.CAROUSEL_IMAGES_LENGTH !== undefined ? Number(process.env.CAROUSEL_IMAGES_LENGTH) : 1,
  maxInterestingPropertiesCount: Number(process.env.MAX_INTERESTING_PROPERTIES_COUNT) || 2,
  vision: {
    modelConfidenceThreshold: Number(process.env.VISION_MODEL_CONFIDENCE_THRESHOLD) || 0.8,
    textConfidenceThreshold: Number(process.env.VISION_TEXT_CONFIDENCE_THRESHOLD) || 0.2
  },
  sequentialPromiseExecution: process.env.SEQUENTIAL_PROMISE_EXECUTION === 'true',
  // Environment-specific overrides
  ...loadEnvironmentConfig(),
  aiRetryCount: Number(process.env.AI_RETRY_COUNT) || 2,
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    global: {
      windowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 100
    },
    findCars: {
      windowMs: Number(process.env.RATE_LIMIT_FIND_CARS_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_FIND_CARS_MAX) || 10
    },
    compareCars: {
      windowMs: Number(process.env.RATE_LIMIT_COMPARE_CARS_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_COMPARE_CARS_MAX) || 20
    },
    askAboutCar: {
      windowMs: Number(process.env.RATE_LIMIT_ASK_ABOUT_CAR_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_ASK_ABOUT_CAR_MAX) || 30
    },
    getAlternatives: {
      windowMs: Number(process.env.RATE_LIMIT_GET_ALTERNATIVES_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_GET_ALTERNATIVES_MAX) || 20
    },
    refineSearch: {
      windowMs: Number(process.env.RATE_LIMIT_REFINE_SEARCH_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_REFINE_SEARCH_MAX) || 15
    },
    health: {
      windowMs: Number(process.env.RATE_LIMIT_HEALTH_WINDOW_MS) || 60 * 1000,
      max: Number(process.env.RATE_LIMIT_HEALTH_MAX) || 100
    },
    conversation: {
      windowMs: Number(process.env.RATE_LIMIT_CONVERSATION_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_CONVERSATION_MAX) || 50
    },
    slowDown: {
      windowMs: Number(process.env.RATE_LIMIT_SLOW_DOWN_WINDOW_MS) || 15 * 60 * 1000,
      delayAfter: Number(process.env.RATE_LIMIT_SLOW_DOWN_DELAY_AFTER) || 5,
      delayMs: 100,
      maxDelayMs: Number(process.env.RATE_LIMIT_SLOW_DOWN_MAX_DELAY_MS) || 2000
    },
    ollamaQueue: {
      concurrency: Number(process.env.OLLAMA_QUEUE_CONCURRENCY) || 3,
      timeout: Number(process.env.OLLAMA_QUEUE_TIMEOUT) || 60000,
      maxQueueSize: Number(process.env.OLLAMA_QUEUE_MAX_SIZE) || 20
    }
  }
};

/**
 * Validates required configuration
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [];
  

  
  if (!config.ollama.url) {
    requiredEnvVars.push('OLLAMA_URL');
  }
  
  // Validate cloud configuration if enabled
  if (config.ollama.cloudEnabled) {
    if (!config.ollama.cloudApiKey) {
      requiredEnvVars.push('OLLAMA_CLOUD_API_KEY (required when OLLAMA_CLOUD_ENABLED=true)');
    }
    if (!config.ollama.cloudUrl) {
      requiredEnvVars.push('OLLAMA_CLOUD_URL (required when OLLAMA_CLOUD_ENABLED=true)');
    }
  }
  
  if (config.aiRetryCount < 0) {
    requiredEnvVars.push('AI_RETRY_COUNT (must be a non-negative number)');
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