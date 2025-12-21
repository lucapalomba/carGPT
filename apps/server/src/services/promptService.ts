import { readFileSync } from 'fs';
import path from 'path';

/**
 * Service to handle loading and managing prompt templates
 */
export const promptService = {
  /**
   * Loads a prompt template from the prompt-templates directory.
   * 
   * @param {string} fileName - The name of the template file (e.g., 'find-cars.md')
   * @returns {string} The content of the template file
   * @throws {Error} If the file cannot be read
   */
  loadTemplate(fileName: string): string {
    try {
      const templatePath = path.join(process.cwd(), 'prompt-templates', fileName);
      return readFileSync(templatePath, 'utf8');
    } catch (error: any) {
      console.error(`Error loading template ${fileName}:`, error);
      throw new Error(`Unable to load prompt template: ${fileName}`);
    }
  }
};
