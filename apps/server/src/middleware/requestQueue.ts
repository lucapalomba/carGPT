import { Request, Response, NextFunction } from 'express';
import PQueue from 'p-queue';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

let ollamaQueue: PQueue;

const initializeQueue = () => {
  if (!ollamaQueue) {
    ollamaQueue = new PQueue({
      concurrency: config.rateLimit.ollamaQueue.concurrency,
      timeout: config.rateLimit.ollamaQueue.timeout,
      throwOnTimeout: true
    });

    ollamaQueue.on('active', () => {
      logger.debug('Ollama queue request started', {
        size: ollamaQueue.size,
        pending: ollamaQueue.pending
      });
    });

    ollamaQueue.on('idle', () => {
      logger.debug('Ollama queue is idle');
    });

    ollamaQueue.on('error', (error) => {
      logger.error('Ollama queue error', { error: error.message });
    });

    logger.info('Ollama request queue initialized', {
      concurrency: config.rateLimit.ollamaQueue.concurrency,
      timeout: config.rateLimit.ollamaQueue.timeout,
      maxQueueSize: config.rateLimit.ollamaQueue.maxQueueSize
    });
  }
  return ollamaQueue;
};

export interface QueueInfo {
  queuedAt: number;
  position: number;
}

// Augment Express Request type
declare module 'express' {
  interface Request {
    queueInfo?: QueueInfo;
  }
}

/**
 * Middleware to queue Ollama requests to prevent overload
 */
export const queueOllamaRequest = (req: Request, res: Response, next: NextFunction) => {
  const queue = initializeQueue();

  if (queue.size > config.rateLimit.ollamaQueue.maxQueueSize) {
    logger.warn('Ollama queue full', {
      size: queue.size,
      pending: queue.pending,
      ip: req.ip
    });
    
    res.status(503).json({
      success: false,
      error: 'Server is busy processing requests. Please try again in a moment.',
      retryAfter: '30 seconds'
    });
    return;
  }

  const queueTask = async () => {
    req.queueInfo = {
      queuedAt: Date.now(),
      position: queue.pending
    };

    logger.info('Processing queued Ollama request', {
      sessionId: req.sessionID,
      url: req.originalUrl,
      queueSize: queue.size
    });
  };

  queue.add(queueTask).then(() => {
    next();
  }).catch((error: Error) => {
    if (error.name === 'TimeoutError') {
      logger.error('Ollama request timeout', {
        sessionId: req.sessionID,
        url: req.originalUrl
      });
      res.status(504).json({
        success: false,
        error: 'Request timed out. The AI is taking too long to respond.',
        retryAfter: '60 seconds'
      });
    } else {
      logger.error('Ollama queue error', { error: error.message });
      next(error);
    }
  });
};

/**
 * Get queue statistics
 */
export const getQueueStats = () => {
  const queue = initializeQueue();
  return {
    size: queue.size,
    pending: queue.pending,
    isPaused: queue.isPaused
  };
};
