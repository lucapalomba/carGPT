import { Message as OllamaMessage } from '../ollamaService.js';
import { injectable, inject } from 'inversify';
import { ITranslationService, IOllamaService, IPromptService, SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import logger from '../../utils/logger.js';
import { CarTranslationSchema, AnalysisTranslationSchema } from '../../utils/schemas.js';
import { config } from '../../config/index.js';

@injectable()
export class TranslationService implements ITranslationService {
  constructor(
    @inject(SERVICE_IDENTIFIERS.OLLAMA_SERVICE) private ollamaService: IOllamaService,
    @inject(SERVICE_IDENTIFIERS.PROMPT_SERVICE) private promptService: IPromptService
  ) {}

  /**
   * Translates the search response to the target language
   */
  async translateResults(
    results: any,
    targetLanguage: string,
    trace: any
  ): Promise<any> {
    const span = trace.span({ 
      name: "translate_results",
      metadata: { targetLanguage, carsCount: results.cars?.length }
    });
    
    logger.info(`Translating results to ${targetLanguage}`, { carsCount: results.cars?.length });

    try {
      // Translate analysis separately
      const translatedAnalysis = results.analysis 
        ? await this.translateAnalysis(results.analysis, targetLanguage, trace)
        : results.analysis;

      // Translate each car individually
      const originalCars = Array.isArray(results.cars) ? results.cars : [];
      let translatedCars: any[];

      if (config.sequentialPromiseExecution) {
        // Sequential execution
        translatedCars = [];
        for (let i = 0; i < originalCars.length; i++) {
          const car = originalCars[i];
          const translatedCar = await this.translateSingleCar(car, targetLanguage, trace, i);
          translatedCars.push(translatedCar);
        }
      } else {
        // Parallel execution
        translatedCars = await Promise.all(
          originalCars.map((car: unknown, index: number) => this.translateSingleCar(car, targetLanguage, trace, index))
        );
      }

      const translatedResult = {
        ...results,
        analysis: translatedAnalysis,
        cars: translatedCars
      };
      
      span.end({ output: { carsTranslated: translatedCars.length } });
      return translatedResult;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Translation failed, returning original results', { error: errorMessage });
      
      span.end({ level: "ERROR", statusMessage: errorMessage });
      return results; // Return original results if translation fails
    }
  }

  /**
   * Translates a single car object
   */
  async translateSingleCar(
    car: any,
    targetLanguage: string,
    trace: any,
    index: number
  ): Promise<any> {
    try {
      const translateCarTemplate = this.promptService.loadTemplate('translate-car.md');
       const jsonGuard = this.promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        {
          role: "system",
          content: translateCarTemplate.replace(/\${targetLanguage}/g, targetLanguage)
        },
        {
          role: "system",
          content: jsonGuard
        },
        {
          role: "user",
          content: JSON.stringify(car)
        }
      ];

      const translatedCar = await this.ollamaService.callOllamaStructured(
        messages, 
        CarTranslationSchema,
        "Translated car details",
        trace, 
        `translate_car_${car.make}_${car.model}`
      );
      
      // Validate the translated car maintains critical fields
      if (!this.validateCarTranslation(car, translatedCar)) {
        logger.warn('Car translation validation failed, using original', { 
          index, 
          make: car.make, 
          model: car.model 
        });
        return car;
      }

      // Preserve pinned status from original
      if (car.pinned !== undefined) {
        // We need to cast because the schema might not include pinned, but we want to carry it over
        (translatedCar as any).pinned = car.pinned;
      }

      return translatedCar;
    } catch (error) {
      logger.warn('Failed to translate car, using original', { 
        index, 
        make: car.make, 
        model: car.model,
        error: error instanceof Error ? error.message : String(error)
      });
      return car; // Return original car if translation fails
    }
  }

  /**
   * Translates the analysis text
   */
  async translateAnalysis(
    analysis: string,
    targetLanguage: string,
    trace: any
  ): Promise<string> {
    const span = trace.span({ 
      name: "translate_analysis",
      metadata: { targetLanguage, inputLength: analysis.length }
    });

    try {
      const translateAnalysisTemplate = this.promptService.loadTemplate('translate-analysis.md');
      const jsonGuard = this.promptService.loadTemplate('json-guard.md');

      const messages: OllamaMessage[] = [
        {
          role: "system",
          content: translateAnalysisTemplate.replace(/\${targetLanguage}/g, targetLanguage)
        },
        {
          role: "system",
          content: jsonGuard
        },
        {
          role: "user",
          content: analysis
        }
      ];

      const result = await this.ollamaService.callOllamaStructured(
        messages, 
        AnalysisTranslationSchema,
        "Translated analysis text",
        trace, 
        'translate_analysis'
      );
      
      const translatedText = (result as any).analysis;
      
      if (!translatedText || translatedText.length < 10) {
        logger.warn('Analysis translation seems invalid, using original');
        span.end({ output: analysis, statusMessage: 'Invalid translation, using original' });
        return analysis;
      }

      span.end({ output: translatedText });
      return translatedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Failed to translate analysis, using original', { error: errorMessage });
      span.end({ level: "ERROR", statusMessage: errorMessage });
      return analysis; // Return original analysis if translation fails
    }
  }

  /**
   * Validates that a translated car maintains critical unchanged fields
   */
  public validateCarTranslation(original: any, translated: any): boolean {
    if (!translated || typeof translated !== 'object') {
      logger.warn('Car translation: result is not an object');
      return false;
    }

    // Make and model must remain unchanged (identity fields)
    if (original.make !== translated.make) {
      logger.warn('Car translation: make changed', { original: original.make, translated: translated.make });
      return false;
    }
    if (original.model !== translated.model) {
      logger.warn('Car translation: model changed', { original: original.model, translated: translated.model });
      return false;
    }

    // Year must remain unchanged (identity field)
    if (original.year !== translated.year) {
      logger.warn('Car translation: year changed', { original: original.year, translated: translated.year });
      return false;
    }

    // Percentage - warn but don't fail
    if (original.percentage !== translated.percentage) {
      logger.warn('Car translation: percentage changed (keeping translated)', { 
        original: original.percentage, 
        translated: translated.percentage 
      });
      // Fix: copy original percentage to translated
      translated.percentage = original.percentage;
    }

    // precise_model - warn but don't fail
    if (original.precise_model !== translated.precise_model) {
      logger.warn('Car translation: precise_model changed (keeping original)', { 
        original: original.precise_model, 
        translated: translated.precise_model 
      });
      // Fix: copy original precise_model to translated
      translated.precise_model = original.precise_model;
    }

    // configuration - warn but don't fail
    if (original.configuration !== translated.configuration) {
      logger.warn('Car translation: configuration changed (keeping original)', { 
        original: original.configuration, 
        translated: original.configuration 
      });
      // Fix: copy original configuration to translated
      translated.configuration = original.configuration;
    }

    return true;
  }
}
