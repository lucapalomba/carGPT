import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptService } from '../promptService.js';
import { readFileSync } from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

vi.mock('fs');
vi.mock('../../utils/logger.js');

describe('promptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load a template successfully', () => {
    const mockContent = 'mock template content';
    vi.mocked(readFileSync).mockReturnValue(mockContent);

    const result = promptService.loadTemplate('test.md');

    expect(result).toBe(mockContent);
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('prompt-templates', 'test.md')),
      'utf8'
    );
  });

  it('should throw an error and log if template loading fails', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => promptService.loadTemplate('missing.md')).toThrow('Unable to load prompt template: missing.md');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error loading template missing.md:'),
      expect.any(Object)
    );
  });
});
