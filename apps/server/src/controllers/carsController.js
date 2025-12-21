import { ollamaService } from '../services/ollamaService.js';
import { conversationService } from '../services/conversationService.js';
import { promptService } from '../services/promptService.js';
import { config } from '../config/index.js';

/**
 * Controller for car search operations
 */
export const carsController = {
  /**
   * Analyzes requirements and finds cars
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async findCars(req, res) {
    try {
      const { requirements } = req.body;
      const language = req.headers['accept-language'] || 'en';
      const sessionId = req.sessionID;

      if (!requirements || requirements.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Describe your needs in more detail (at least 10 characters)'
        });
      }

      const conversation = conversationService.getOrInitialize(sessionId);

      const findCarPromptTemplate = promptService.loadTemplate('find-cars.md');
      const messages = [
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

      console.log('📝 Request received:', requirements);
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

      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Error analyzing requirements. Please try with a different description.',
          debug: !config.isProduction ? response : undefined
        });
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

      console.log('✅ Suggestions generated:', result.cars.map(c => `${c.make} ${c.model}`).join(', '));

      res.json({
        success: true,
        conversationId: sessionId,
        analysis: result.analysis,
        cars: result.cars
      });

    } catch (error) {
      console.error('Error in find-cars:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error retrieving suggestions'
      });
    }
  },

  /**
   * Refines car search based on feedback
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async refineSearch(req, res) {
    try {
      const { feedback, pinnedCars } = req.body;
      const language = req.headers['accept-language'] || 'en';
      const sessionId = req.sessionID;

      if (!feedback) {
        return res.status(400).json({
          success: false,
          error: 'Please provide some feedback to refine the search'
        });
      }

      const conversation = conversationService.get(sessionId);
      if (!conversation) {
        return res.status(400).json({
          success: false,
          error: 'No active conversation found. Start a new search first.'
        });
      }

      let originalRequirements = conversation.requirements || '';
      if (!originalRequirements && conversation.history) {
        const findAction = conversation.history.find(h => h.type === 'find-cars');
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
        conversation.history.forEach((h, index) => {
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

        result.cars = result.cars.map(car => ({
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

      } catch (parseError) {
        console.error('Error parsing refinement:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Error refining search. Please try again.',
          debug: !config.isProduction ? response : undefined
        });
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

    } catch (error) {
      console.error('Error in refine-search:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Answers a question about a specific car
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async askAboutCar(req, res) {
    try {
      const { car, question } = req.body;
      const language = req.headers['accept-language'] || 'en';
      const sessionId = req.sessionID;

      if (!car || !question) {
        return res.status(400).json({
          success: false,
          error: 'Select a car and provide a question'
        });
      }

      console.log(`💬 Question about ${car}: ${question}`);

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
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Error retrieving answer. Please try again.',
          debug: !config.isProduction ? response : undefined
        });
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

    } catch (error) {
      console.error('Error in ask-about-car:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Retrieves alternative cars
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAlternatives(req, res) {
    try {
      const { car, reason } = req.body;
      const language = req.headers['accept-language'] || 'en';
      const sessionId = req.sessionID;

      if (!car) {
        return res.status(400).json({
          success: false,
          error: 'Select a car to find alternatives'
        });
      }

      console.log(`🔄 Seeking alternatives for: ${car}`);

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
      } catch (parseError) {
        console.error('Error parsing alternatives:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Error generating alternatives. Please try again.',
          debug: !config.isProduction ? response : undefined
        });
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

    } catch (error) {
      console.error('Error in get-alternatives:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Compares two cars
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async compareCars(req, res) {
    try {
      const { car1, car2 } = req.body;
      const language = req.headers['accept-language'] || 'en';
      const sessionId = req.sessionID;

      if (!car1 || !car2) {
        return res.status(400).json({
          success: false,
          error: 'Select two cars for comparison'
        });
      }

      console.log(`⚖️ Comparing ${car1} vs ${car2}`);

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
      } catch (parseError) {
        console.error('Error parsing comparison:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Error generating comparison. Please try again.',
          debug: !config.isProduction ? response : undefined
        });
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

    } catch (error) {
      console.error('Error in compare-cars:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
