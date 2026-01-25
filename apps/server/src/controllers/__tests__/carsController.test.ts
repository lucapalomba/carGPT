import { describe, it, expect, vi, beforeEach } from 'vitest';
import { carsController } from '../carsController.js';
import { container } from '../../container/index.js';
import { SERVICE_IDENTIFIERS } from '../../container/interfaces.js';
import { ValidationError } from '../../utils/AppError.js';

vi.mock('../../container/index.js', () => ({
  container: {
    get: vi.fn()
  }
}));

describe('carsController', () => {
  let req: any;
  let res: any;
  let mockAIService: any;
  let mockConversationService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      headers: {},
      sessionID: 'session-123'
    };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
    mockAIService = {
      findCarsWithImages: vi.fn(),
      refineCarsWithImages: vi.fn()
    };
    mockConversationService = {
        getOrInitialize: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
    };

    vi.mocked(container.get).mockImplementation((id) => {
        if (id === SERVICE_IDENTIFIERS.AI_SERVICE) return mockAIService;
        if (id === SERVICE_IDENTIFIERS.CONVERSATION_SERVICE) return mockConversationService;
        return null;
    });
  });

  describe('findCars', () => {
    it('should call next with ValidationError if requirements are too short', async () => {
      req.body.requirements = 'short';
      const next = vi.fn();
      await carsController.findCars(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should call aiService and update conversation', async () => {
      req.body = { requirements: 'I need a family car with good safety features' };
      const mockResult = { 
        cars: [{ 
          make: 'Volvo', 
          model: 'XC90', 
          year: 2022,
          vehicle_properties: {},
          constraints_satisfaction: { budget: "100, ok" }
        }], 
        userLanguage: 'en' 
      };
      mockAIService.findCarsWithImages.mockResolvedValue(mockResult);
      
      const mockConversation = { history: [], userLanguage: '' };
      mockConversationService.getOrInitialize.mockReturnValue(mockConversation as any);

      const next = vi.fn();
      await carsController.findCars(req, res, next);

      expect(container.get).toHaveBeenCalledWith(SERVICE_IDENTIFIERS.AI_SERVICE);
      expect(mockAIService.findCarsWithImages).toHaveBeenCalledWith('I need a family car with good safety features', 'en', 'session-123');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        cars: mockResult.cars
      }));
      expect(mockConversation.history).toHaveLength(1);
    });
  });

  describe('refineSearch', () => {
    it('should call next with ValidationError if no feedback', async () => {
      const next = vi.fn();
      await carsController.refineSearch(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should throw ValidationError if no active conversation', async () => {
      req.body.feedback = 'More speed';
      mockConversationService.get.mockReturnValue(null);
      const next = vi.fn();
      await carsController.refineSearch(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should call aiService.refineCarsWithImages and return success', async () => {
        req.body.feedback = 'I want it in Red';
        req.body.pinnedCars = [{ make: 'Tesla', model: 'S' }];
        const mockConversation = { 
            history: [{ type: 'find-cars', data: { requirements: 'electric' } }],
            requirements: 'electric'
        };
        mockConversationService.get.mockReturnValue(mockConversation);
        mockAIService.refineCarsWithImages.mockResolvedValue({ cars: [] });

        await carsController.refineSearch(req, res, vi.fn());

        expect(container.get).toHaveBeenCalledWith(SERVICE_IDENTIFIERS.AI_SERVICE);
        expect(mockAIService.refineCarsWithImages).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('resetConversation', () => {
    it('should delete conversation and return success', async () => {
      await carsController.resetConversation(req, res, vi.fn());
      expect(mockConversationService.delete).toHaveBeenCalledWith('session-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Conversation reset' });
    });
  });
});
