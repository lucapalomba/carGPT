import { Message as OllamaMessage } from '../ollamaService.js';
import { injectable, inject } from 'inversify';
import { IElaborationService, IOllamaService, IPromptService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import logger from '../../utils/logger.js';
import { Car } from './types.js';
import { getDateSystemMessage } from '../../utils/dateUtils.js';
import { config } from '../../config/index.js';

import { ElaborationSchema } from '../../utils/schemas.js';

@injectable()
export class ElaborationService implements IElaborationService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  /**
   * Elaborate car details using a flat JSON schema
   */
  async elaborateCars(carChoices: any[], searchIntent: any, trace: any): Promise<Car[]> {
    const span = trace.span({ name: "elaborate_cars_parallel", input: { count: carChoices.length } });
    try {
      const carsElaborationTemplates = this.promptService.loadTemplate('elaborate_suggestion.md');
      const jsonGuard = this.promptService.loadTemplate('json-guard.md');

      let elaboratedCars: Car[];
      if (config.sequentialPromiseExecution) {
        elaboratedCars = [];
        for (const carChoice of carChoices) {
          try {
            const messages: OllamaMessage[] = [
              { role: "system", content: "Today is: " + getDateSystemMessage() },
              { role: "system", content: carsElaborationTemplates },
              { role: "system", content: "Current car to elaborate: " + JSON.stringify(carChoice) },
              { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
              { role: "system", content: jsonGuard }
            ];

            const result = await this.ollamaService.callOllamaStructured(
              messages,
              ElaborationSchema,
              "Elaborated car details",
              trace,
              `elaborate_${carChoice.make}_${carChoice.model}`
            );

            let elaborationData = result;
            if ((result as any).car && typeof (result as any).car === 'object') {
              elaborationData = (result as any).car;
            }

            if (!elaborationData || (typeof elaborationData !== 'object')) {
              throw new Error('Invalid elaboration structure');
            }

            const merged = { ...carChoice, ...elaborationData };
            elaboratedCars.push(merged);
          } catch (error: unknown) {
            logger.error(`Elaboration failed for ${carChoice.make} ${carChoice.model}`, {
              error: error instanceof Error ? error.message : String(error)
            });
            elaboratedCars.push(carChoice);
          }
        }
      } else {
        elaboratedCars = await Promise.all(carChoices.map(async (carChoice: any) => {
          try {
            const messages: OllamaMessage[] = [
              { role: "system", content: "Today is: " + getDateSystemMessage() },
              { role: "system", content: carsElaborationTemplates },
              { role: "system", content: "Current car to elaborate: " + JSON.stringify(carChoice) },
              { role: "system", content: "User intent JSON: " + JSON.stringify(searchIntent) },
              { role: "system", content: jsonGuard }
            ];

            const result = await this.ollamaService.callOllamaStructured(
              messages,
              ElaborationSchema,
              "Elaborated car details",
              trace,
              `elaborate_${carChoice.make}_${carChoice.model}`
            );

            // Simplified logic: Assume flat structure as per new prompt
            let elaborationData = result;

            // Legacy fallback: if model still wraps in "car", unwrap it
            if ((result as any).car && typeof (result as any).car === 'object') {
              elaborationData = (result as any).car;
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
      }

      span.end({ output: { count: elaboratedCars.length } });
      return elaboratedCars;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: String(error) });
      throw error;
    }
  }
}
