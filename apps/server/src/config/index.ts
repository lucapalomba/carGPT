import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

/**
 * CarGPT Configuration
 */
export const config = {
  port: process.env.PORT || 3000,
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'ministral',
  },
  aiProvider: process.env.AI_PROVIDER || 'ollama',
  mode: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  isProduction: (process.env.APP_ENV || process.env.NODE_ENV) === 'production',
  session: {
    secret: process.env.SESSION_SECRET || 'cargpt-secret-key-change-in-production',
    cookie: { maxAge: 3600000 } // 1 hour
  },
  googleSearch: {
    apiKey: process.env.GOOGLE_API_KEY,
    cx: process.env.GOOGLE_CX
  },
  carouselImageLength: Number(process.env.CAROUSEL_IMAGES_LENGHT) || 1
};

/**
 * Loads the swagger document from the filesystem.
 * @returns {Object} The JSON swagger document.
 */
export const loadSwaggerDocument = () => {
  return JSON.parse(readFileSync('./swagger.json', 'utf8'));
};
