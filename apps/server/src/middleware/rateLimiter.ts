import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import slowDown, { SlowDownRequestHandler } from 'express-slow-down';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Custom key generator (use session ID if available, fallback to IP)
 */
const keyGenerator = (req: { sessionID?: string; ip?: string }) => {
  return req.sessionID || req.ip || 'unknown';
};

/**
 * Custom handler for rate limit exceeded
 */
const onLimitReached = (req: { sessionID?: string; ip?: string; originalUrl?: string; method?: string }, options: { windowMs: number; max: number }) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    sessionId: req.sessionID,
    url: req.originalUrl,
    method: req.method,
    windowMs: options.windowMs,
    limit: options.max
  });
};

/**
 * Skip rate limiting configuration
 */
let rateLimitDisabledLogged = false;

const skipRateLimit = () => {
  if (!config.rateLimit.enabled) {
    if (!rateLimitDisabledLogged) {
      logger.info('Rate limiting is disabled');
      rateLimitDisabledLogged = true;
    }
    return true;
  }
  return process.env.NODE_ENV === 'test';
};

/**
 * Create rate limiter with custom config
 */
const createRateLimiter = (windowMs: number, max: number, message: object): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      onLimitReached(req, { windowMs, max });
      res.status(429).json({
        success: false,
        ...message as object
      });
    },
    skip: skipRateLimit
  });
};

/**
 * Create slow down middleware with custom config
 */
const createSlowDown = (windowMs: number, delayAfter: number, delayMs: number, maxDelayMs: number): SlowDownRequestHandler => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs,
    keyGenerator,
    handler: (req: Request, _res: Response) => {
      logger.info('Slow down activated', {
        ip: req.ip,
        hits: (req as unknown as { slowDown?: { current: number; delay: number } }).slowDown?.current,
        delay: (req as unknown as { slowDown?: { current: number; delay: number } }).slowDown?.delay
      });
    },
    skip: skipRateLimit
  });
};

// Global rate limiter
export const globalLimiter = createRateLimiter(
  config.rateLimit.global.windowMs,
  config.rateLimit.global.max,
  { error: 'Too many requests from this IP, please try again later.', retryAfter: '15 minutes' }
);

// Per-endpoint rate limiters
export const findCarsLimiter = createRateLimiter(
  config.rateLimit.findCars.windowMs,
  config.rateLimit.findCars.max,
  { error: 'Too many AI requests. Please wait before searching again.', retryAfter: '15 minutes', tip: 'Try refining your existing results instead of starting new searches.' }
);

export const compareCarsLimiter = createRateLimiter(
  config.rateLimit.compareCars.windowMs,
  config.rateLimit.compareCars.max,
  { error: 'Too many compare requests. Please slow down.', retryAfter: '15 minutes' }
);

export const askAboutCarLimiter = createRateLimiter(
  config.rateLimit.askAboutCar.windowMs,
  config.rateLimit.askAboutCar.max,
  { error: 'Too many questions. Please wait a moment.', retryAfter: '15 minutes' }
);

export const getAlternativesLimiter = createRateLimiter(
  config.rateLimit.getAlternatives.windowMs,
  config.rateLimit.getAlternatives.max,
  { error: 'Too many alternative requests. Please slow down.', retryAfter: '15 minutes' }
);

export const refineSearchLimiter = createRateLimiter(
  config.rateLimit.refineSearch.windowMs,
  config.rateLimit.refineSearch.max,
  { error: 'Too many refine requests. Please wait before searching again.', retryAfter: '15 minutes', tip: 'Try broadening your search criteria.' }
);

export const healthLimiter = createRateLimiter(
  config.rateLimit.health.windowMs,
  config.rateLimit.health.max,
  { error: 'Too many health check requests' }
);

export const conversationLimiter = createRateLimiter(
  config.rateLimit.conversation.windowMs,
  config.rateLimit.conversation.max,
  { error: 'Too many conversation operations', retryAfter: '15 minutes' }
);

// Slow down middleware
export const apiSlowDown = createSlowDown(
  config.rateLimit.slowDown.windowMs,
  config.rateLimit.slowDown.delayAfter,
  config.rateLimit.slowDown.delayMs,
  config.rateLimit.slowDown.maxDelayMs
);
