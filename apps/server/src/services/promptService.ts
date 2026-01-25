import { readFileSync } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { injectable } from 'inversify';
import { IPromptService } from '../container/interfaces.js';

@injectable()
export class PromptService implements IPromptService {
  loadTemplate(fileName: string): string {
    try {
      const templatePath = path.join(process.cwd(), 'prompt-templates', fileName);
      return readFileSync(templatePath, 'utf8');
    } catch (error: unknown) {
      logger.error(`Error loading template ${fileName}:`, { error });
      throw new Error(`Unable to load prompt template: ${fileName}`);
    }
  }
}