import { Request, Response } from 'express';
import { ollamaService, Message } from '../services/ollamaService.js';
import { conversationService, Conversation, ConversationHistoryItem } from '../services/conversationService.js';
import { promptService } from '../services/promptService.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Controller for car search operations
 */
export const carsController = {
  /**
   * Analyzes requirements and finds cars
   */
  findCars: asyncHandler(async (req: Request, res: Response) => {
    const { requirements } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!requirements || requirements.trim().length < 10) {
      throw new ValidationError('Describe your needs in more detail (at least 10 characters)');
    }

    const conversation = conversationService.getOrInitialize(sessionId);

    const findCarPromptTemplate = promptService.loadTemplate('find-cars.md');
    logger.info('Car search request received', { requirements, sessionId });
    
    const messages: Message[] = [
      {
        role: "system",
        content: findCarPromptTemplate
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: requirements
      }
    ];

    const response = await ollamaService.callOllama(messages);
    
    let result;
    try {
      result = ollamaService.parseJsonResponse(response);
      const carsArray = result.cars || result.auto;

      if (!carsArray || !Array.isArray(carsArray) || carsArray.length !== 3) {
        throw new Error('Invalid JSON structure - expected 3 cars');
      }

      if (result.userLanguage) {
        conversation.userLanguage = result.userLanguage;
      }

    } catch (parseError: any) {
      logger.error('Error parsing Ollama response in findCars', { parseError: parseError.message, response });
      throw new Error('Error analyzing requirements. Please try with a different description.');
    }

    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'find-cars',
      timestamp: new Date(),
      data: {
        requirements: requirements,
        result: result,
        messages: messages
      }
    });

    logger.info('Suggestions generated successfully', { 
      sessionId, 
      cars: result.cars.map((c: any) => `${c.make} ${c.model}`).join(', ') 
    });

    res.json({
      success: true,
      conversationId: sessionId,
      analysis: result.analysis,
      cars: result.cars
    });
  }),

  /**
   * Refines car search based on feedback
   */
  refineSearch: asyncHandler(async (req: Request, res: Response) => {
    const { feedback, pinnedCars } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!feedback) {
      throw new ValidationError('Please provide some feedback to refine the search');
    }

    const conversation: Conversation | undefined = conversationService.get(sessionId);
    if (!conversation) {
      throw new ValidationError('No active conversation found. Start a new search first.');
    }

    let originalRequirements = conversation.requirements || '';
    if (!originalRequirements && conversation.history) {
      const findAction = conversation.history.find((h: ConversationHistoryItem) => h.type === 'find-cars');
      if (findAction) {
        originalRequirements = findAction.data.requirements;
      }
    }

    if (!originalRequirements) {
      originalRequirements = "User is looking for a car.";
    }

    let contextParts = [];
    if (originalRequirements) contextParts.push(`Original Request: "${originalRequirements}"`);

    if (conversation.history) {
      conversation.history.forEach((h: ConversationHistoryItem, index: number) => {
        if (h.type === 'refine-search' && h.data.feedback) {
          contextParts.push(`Refinement Step ${index + 1}: "${h.data.feedback}"`);
        }
      });
    }

    const fullContext = contextParts.join('\n');
    const refinePromptTemplate = promptService.loadTemplate('refine-cars.md');

    let pinnedCarsJson = (pinnedCars && pinnedCars.length > 0) ? JSON.stringify(pinnedCars) : 'None';

    const messages = [
      {
        role: "system",
        content: refinePromptTemplate
          .replace('${requirements}', fullContext)
          .replace('${pinnedCars}', pinnedCarsJson)
          .replace('${feedback}', feedback)
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: "Refine suggestions."
      }
    ];

    const response = await ollamaService.callOllama(messages);
    let result;
    try {
      result = ollamaService.parseJsonResponse(response);
      if (!result.cars || !Array.isArray(result.cars)) {
        throw new Error('Invalid JSON structure - expected cars array');
      }

      result.cars = result.cars.map((car: any) => ({
        make: car.make || car.marca,
        model: car.model || car.modello,
        year: car.year || car.anno,
        price: car.price || car.prezzo,
        type: car.type || car.tipo,
        strengths: car.strengths || car.puntiForza || [],
        weaknesses: car.weaknesses || car.puntiDeboli || [],
        reason: car.reason || car.motivazione,
        properties: car.properties || {}
      }));

    } catch (parseError: any) {
      logger.error('Error parsing refinement response', { parseError: parseError.message, response });
      throw new Error('Error refining search. Please try again.');
    }

    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'refine-search',
      timestamp: new Date(),
      data: {
        feedback,
        pinnedCars,
        result,
        messages
      }
    });

    res.json({
      success: true,
      analysis: result.analysis,
      cars: result.cars
    });
  }),

  /**
   * Answers a question about a specific car
   */
  askAboutCar: asyncHandler(async (req: Request, res: Response) => {
    const { car, question } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!car || !question) {
      throw new ValidationError('Select a car and provide a question');
    }

    logger.info('Question about car received', { car, question, sessionId });

    const askingPromptTemplate = promptService.loadTemplate('asking-car.md');
    const messages = [
      {
        role: "system",
        content: askingPromptTemplate
          .replace('${car}', car)
          .replace('${question}', question)
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: question
      }
    ];

    const response = await ollamaService.callOllama(messages);
    let result;
    try {
      result = ollamaService.parseJsonResponse(response);
    } catch (parseError: any) {
      logger.error('Error parsing askAboutCar response', { parseError: parseError.message, response });
      throw new Error('Error retrieving answer. Please try again.');
    }

    const conversation = conversationService.getOrInitialize(sessionId);
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'ask-about-car',
      timestamp: new Date(),
      data: {
        car,
        question,
        result,
        messages
      }
    });

    res.json({
      success: true,
      car: car,
      question: question,
      answer: result.answer
    });
  }),

  /**
   * Retrieves alternative cars
   */
  getAlternatives: asyncHandler(async (req: Request, res: Response) => {
    const { car, reason } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!car) {
      throw new ValidationError('Select a car to find alternatives');
    }

    logger.info('Alternatives request received', { car, sessionId });

    const alternativePromptTemplate = promptService.loadTemplate('get-alternative-car.md');
    const messages = [
      {
        role: "system",
        content: alternativePromptTemplate
          .replace('${car}', car)
          .replace('${reason}', reason || 'find similar alternatives')
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: `Suggest 3 alternatives to ${car}`
      }
    ];

    const response = await ollamaService.callOllama(messages);
    let result;
    try {
      result = ollamaService.parseJsonResponse(response);
    } catch (parseError: any) {
      logger.error('Error parsing alternatives response', { parseError: parseError.message, response });
      throw new Error('Error generating alternatives. Please try again.');
    }

    const conversation = conversationService.getOrInitialize(sessionId);
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'get-alternatives',
      timestamp: new Date(),
      data: {
        car,
        reason,
        result,
        messages
      }
    });

    res.json({
      success: true,
      alternatives: result.alternatives
    });
  }),

  /**
   * Compares two cars
   */
  compareCars: asyncHandler(async (req: Request, res: Response) => {
    const { car1, car2 } = req.body;
    const language = req.headers['accept-language'] || 'en';
    const sessionId = req.sessionID;

    if (!car1 || !car2) {
      throw new ValidationError('Select two cars for comparison');
    }

    logger.info('Comparison request received', { car1, car2, sessionId });

    const comparePromptTemplate = promptService.loadTemplate('compare-cars.md');
    const messages = [
      {
        role: "system",
        content: comparePromptTemplate
          .replace('${car1}', car1)
          .replace('${car2}', car2)
      },
      {
        role: "system",
        content: `User Preferred Language: ${language}. Always respond in this language.`
      },
      {
        role: "user",
        content: `Compare ${car1} and ${car2}`
      }
    ];

    const response = await ollamaService.callOllama(messages);
    let result;
    try {
      result = ollamaService.parseJsonResponse(response);
    } catch (parseError: any) {
      logger.error('Error parsing comparison response', { parseError: parseError.message, response });
      throw new Error('Error generating comparison. Please try again.');
    }

    const conversation = conversationService.getOrInitialize(sessionId);
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'compare-cars',
      timestamp: new Date(),
      data: {
        car1,
        car2,
        result,
        messages
      }
    });

    res.json({
      success: true,
      comparison: result
    });
  })
};
