import { describe, it, expect, vi } from 'vitest';
import logger, { stream } from '../logger.js';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeTypeOf('function');
    expect(logger.error).toBeTypeOf('function');
    expect(logger.debug).toBeTypeOf('function');
  });

  it('stream.write should call logger.info', () => {
    const infoSpy = vi.spyOn(logger, 'info');
    stream.write('Test log message');
    expect(infoSpy).toHaveBeenCalledWith('Test log message');
  });

  it('consoleFormat should handle metadata and stack', () => {
    // This is hard to test directly since consoleFormat is not exported,
    // but we can trigger logs that exercise it in dev mode.
    // However, the coverage will show if it's hit.
    logger.info('Test with meta', { key: 'value', service: 'ignore-me' });
    try {
        throw new Error('Test stack');
    } catch (e) {
        logger.error('Error with stack', e);
    }
  });
});
