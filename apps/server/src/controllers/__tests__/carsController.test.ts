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

    it('should update the conversation language when the AI returns one', async () => {
      req.body = { requirements: 'I need a family car with good safety features' };
      const mockConversation = { history: [], userLanguage: '' };
      mockConversationService.getOrInitialize.mockReturnValue(mockConversation as any);
      mockAIService.findCarsWithImages.mockResolvedValue({
        cars: [{ make: 'Fiat', model: 'Panda', year: 2021 }],
        userLanguage: 'it'
      });

      await carsController.findCars(req, res, vi.fn());

      expect(mockConversation.userLanguage).toBe('it');
    });

    it('should reject when the AI response has no cars array', async () => {
      req.body = { requirements: 'I need a family car with good safety features' };
      mockConversationService.getOrInitialize.mockReturnValue({ history: [] } as any);
      mockAIService.findCarsWithImages.mockResolvedValue({ userLanguage: 'en' } as any);

      const next = vi.fn();
      await carsController.findCars(req, res, next);
      // asyncHandler forwards rejections on a microtask
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.json).not.toHaveBeenCalled();
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
        expect(mockAIService.refineCarsWithImages).toHaveBeenCalledWith(
          'I want it in Red',
          'en',
          'session-123',
          expect.stringContaining('### Initial Request\n"electric"'),
          expect.any(Array)
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should include assistant suggestions in the context', async () => {
        req.body.feedback = 'Ok for these models';
        const mockConversation = { 
            history: [
                { 
                  type: 'find-cars', 
                  data: { 
                    requirements: 'SUV', 
                    result: { cars: [{ make: 'Toyota', model: 'RAV4', year: 2022 }] } 
                  } 
                }
            ],
            requirements: 'SUV'
        };
        mockConversationService.get.mockReturnValue(mockConversation);
        mockAIService.refineCarsWithImages.mockResolvedValue({ cars: [] });

        await carsController.refineSearch(req, res, vi.fn());

        expect(mockAIService.refineCarsWithImages).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.stringContaining('### Assistant Suggestions (Initial):\nToyota RAV4 (2022)'),
          expect.anything()
        );
    });

    it('should build context from refinement history entries', async () => {
      req.body.feedback = 'prefer red';
      req.body.pinnedCars = 'not-an-array';
      const mockConversation = {
        requirements: 'SUV',
        history: [
          { type: 'find-cars', data: { requirements: 'SUV', result: { cars: [{ make: 'Toyota', model: 'RAV4', year: 2022 }] } } },
          {
            type: 'refine-search',
            data: {
              feedback: 'make it red',
              result: { cars: [{ make: 'Mazda', model: 'CX-5', year: 2023 }] }
            }
          }
        ]
      };
      mockConversationService.get.mockReturnValue(mockConversation);
      mockAIService.refineCarsWithImages.mockResolvedValue({ cars: [] });

      await carsController.refineSearch(req, res, vi.fn());

      const context = mockAIService.refineCarsWithImages.mock.calls[0][3];
      expect(context).toContain('### User feedback (Refinement Step 2):\n"make it red"');
      expect(context).toContain('### Assistant Suggestions (Refinement Step 2):\nMazda CX-5 (2023)');
      // Non-array pinnedCars should be normalised to []
      expect(mockAIService.refineCarsWithImages.mock.calls[0][4]).toEqual([]);
    });

    it('should fall back to a generic request when history has no requirements', async () => {
      req.body.feedback = 'anything';
      mockConversationService.get.mockReturnValue({ history: [] } as any);
      mockAIService.refineCarsWithImages.mockResolvedValue({ cars: [] });

      await carsController.refineSearch(req, res, vi.fn());

      const context = mockAIService.refineCarsWithImages.mock.calls[0][3];
      expect(context).toContain('User is looking for a car.');
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
