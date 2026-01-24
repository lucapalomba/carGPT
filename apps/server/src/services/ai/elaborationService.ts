import { ollamaService, Message as OllamaMessage } from '../ollamaService.js';
import { promptService } from '../promptService.js';
import logger from '../../utils/logger.js';
import { Car } from './types.js';
import { getDateSystemMessage } from '../../utils/dateUtils.js';

export const elaborationService = {
  /**
   * Elaborate car details using a flat JSON schema
   */
  async elaborateCars(carChoices: any[], searchIntent: any, trace: any): Promise<Car[]> {
    const span = trace.span({ name: "elaborate_cars_parallel", input: { count: carChoices.length } });
    try {
      const carsElaborationTemplates = promptService.loadTemplate('elaborate_suggestion.md');
      const jsonGuard = promptService.loadTemplate('json-guard.md');

      const elaboratedCars = await Promise.all(carChoices.map(async (carChoice: any) => {
        try {
const messages: OllamaMessage[] = [
            { role: "system", content: "Today is: " + getDateSystemMessage() },
            { role: "system", content: carsElaborationTemplates },
            { role: "system", content: "Current car to elaborate: " + JSON.stringify(carChoice) },
            { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
            { role: "system", content: jsonGuard }
          ];

          const response = await ollamaService.callOllama(messages, trace, `elaborate_${carChoice.make}_${carChoice.model}`);
          const result = ollamaService.parseJsonResponse(response);
          
          // Simplified logic: Assume flat structure as per new prompt
          // We still keep a safe check just in case, but prioritize the direct result
          let elaborationData = result;

          // Legacy fallback: if the model still wraps in "car", unwrap it
          if (result.car && typeof result.car === 'object') {
             elaborationData = result.car;
          }

          // Basic validation
          if (!elaborationData || (typeof elaborationData !== 'object')) {
             throw new Error('Invalid elaboration structure');
          }

          const merged = { ...carChoice, ...elaborationData };
          return merged;
        } catch (error: unknown) {
          logger.error(`Elaboration failed for ${carChoice.make} ${carChoice.model}`, { 
            error: error instanceof Error ? error.message : String(error)
          });
          return carChoice; // Fallback to original choice if elaboration fails
        }
      }));

      span.end({ output: { count: elaboratedCars.length } });
      return elaboratedCars;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
};
