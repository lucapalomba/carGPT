import langfuse from '../utils/langfuse.js';
import logger from './logger.js';

/**
 * Ensures all Langfuse traces are flushed before shutdown
 */
export async function flushLangfuse(): Promise<void> {
  try {
    logger.debug('Flushing Langfuse traces...');
    await langfuse.shutdownAsync();
    logger.debug('Langfuse traces flushed successfully');
  } catch (error) {
    logger.error('Error flushing Langfuse traces:', error);
  }
}

/**
 * Force flush traces (for immediate visibility)
 */
export async function forceFlushLangfuse(): Promise<void> {
  try {
    await langfuse.flushAsync();
    logger.debug('Langfuse traces force flushed');
  } catch (error) {
    logger.error('Error force flushing Langfuse traces:', error);
  }
}