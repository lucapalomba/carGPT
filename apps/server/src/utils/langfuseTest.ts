import langfuse from '../utils/langfuse.js';
import { forceFlushLangfuse } from '../utils/langfuseUtils.js';
import logger from '../utils/logger.js';

/**
 * Test Langfuse connectivity and trace creation
 */
export async function testLangfuseConnectivity(): Promise<boolean> {
  try {
    logger.info('Testing Langfuse connectivity...');
    
    // Create a test trace
    const testTrace = langfuse.trace({
      name: "langfuse_connectivity_test",
      input: "Test input",
      metadata: { test: true, timestamp: new Date().toISOString() }
    });
    
    // Create a test generation
    testTrace.generation({
      input: "Test generation input",
      output: "Test generation output",
      model: "test-model",
      startTime: new Date(Date.now() - 1000),
      endTime: new Date(),
    });
    
    // Force flush
    await forceFlushLangfuse();
    
    logger.info('Langfuse connectivity test completed successfully', {
      traceId: testTrace.id
    });
    
    return true;
  } catch (error) {
    logger.error('Langfuse connectivity test failed:', error);
    return false;
  }
}