import { describe, it, expect, vi, beforeEach } from 'vitest';
import { carsController } from '../carsController.js';
import { aiService } from '../../services/aiService.js';
import { conversationService } from '../../services/conversationService.js';
import { ValidationError } from '../../utils/AppError.js';

vi.mock('../../services/aiService.js');
vi.mock('../../services/conversationService.js');
vi.mock('../../services/ollamaService.js');
vi.mock('../../services/promptService.js');
vi.mock('../../utils/logger.js');

describe('carsController', () => {
  let req: any;
  let res: any;

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
      const mockResult = { cars: [{ make: 'Volvo', model: 'XC90', year: 2022 }], userLanguage: 'en' };
      vi.mocked(aiService.findCarsWithImages).mockResolvedValue(mockResult as any);
      
      const mockConversation = { history: [], userLanguage: '' };
      vi.mocked(conversationService.getOrInitialize).mockReturnValue(mockConversation as any);

      const next = vi.fn();
      await carsController.findCars(req, res, next);

      expect(aiService.findCarsWithImages).toHaveBeenCalledWith('I need a family car with good safety features', 'en', 'session-123');
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
      (conversationService.get as any).mockReturnValue(null);
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
        (conversationService.get as any).mockReturnValue(mockConversation);
        (aiService.refineCarsWithImages as any).mockResolvedValue({ cars: [] });

        await carsController.refineSearch(req, res, vi.fn());

        expect(aiService.refineCarsWithImages).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should extract context correctly with multiple history items and missing requirements', async () => {
        req.body.feedback = 'Bigger trunk';
        const mockConversation = { 
            history: [
                { type: 'find-cars', data: { requirements: 'SUV' } },
                { type: 'other', data: {} },
                { type: 'refine-search', data: { feedback: 'Hybrid' } }
            ]
        };
        (conversationService.get as any).mockReturnValue(mockConversation);
        (aiService.refineCarsWithImages as any).mockResolvedValue({ cars: [] });

        await carsController.refineSearch(req, res, vi.fn());

        expect(aiService.refineCarsWithImages).toHaveBeenCalledWith(
            'Bigger trunk',
            expect.any(String),
            'session-123',
            expect.stringContaining('Original Request: "SUV"'),
            expect.any(Array)
        );
        expect(aiService.refineCarsWithImages).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(String),
            expect.stringContaining('Refinement Step 3: "Hybrid"'),
            expect.any(Array)
        );
    });

    it('should use default requirements if not found in history', async () => {
        req.body.feedback = 'Bigger trunk';
        const mockConversation = { history: [] };
        (conversationService.get as any).mockReturnValue(mockConversation);
        (aiService.refineCarsWithImages as any).mockResolvedValue({ cars: [] });

        await carsController.refineSearch(req, res, vi.fn());

        expect(aiService.refineCarsWithImages).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(String),
            expect.stringContaining('Original Request: "User is looking for a car."'),
            expect.any(Array)
        );
    });
  });

  describe('askAboutCar', () => {
    it('should throw ValidationError if car or question is missing', async () => {
        const next = vi.fn();
        await carsController.askAboutCar(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should return answer on success', async () => {
        const { ollamaService } = await import('../../services/ollamaService.js');
        const { promptService } = await import('../../services/promptService.js');
        req.body = { car: 'Tesla Model 3', question: 'Range?' };
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockResolvedValue('{"answer": "400 miles"}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({ answer: "400 miles" });
        (conversationService.getOrInitialize as any).mockReturnValue({ history: [] });

        await carsController.askAboutCar(req, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            answer: '400 miles'
        }));
    });
  });

  describe('getAlternatives', () => {
      it('should return alternatives', async () => {
          const { ollamaService } = await import('../../services/ollamaService.js');
          req.body = { car: 'Toyota' };
          (ollamaService.callOllama as any).mockResolvedValue('{"alternatives": []}');
          (ollamaService.parseJsonResponse as any).mockReturnValue({ alternatives: [] });
          (conversationService.getOrInitialize as any).mockReturnValue({ history: [] });

          await carsController.getAlternatives(req, res, vi.fn());
          expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      });
  });

  describe('compareCars', () => {
      it('should return comparison', async () => {
          const { ollamaService } = await import('../../services/ollamaService.js');
          req.body = { car1: 'A', car2: 'B' };
          (ollamaService.callOllama as any).mockResolvedValue('{}');
          (ollamaService.parseJsonResponse as any).mockReturnValue({});
          (conversationService.getOrInitialize as any).mockReturnValue({ history: [] });

          await carsController.compareCars(req, res, vi.fn());
          expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      });
  });

  describe('resetConversation', () => {
    it('should delete conversation and return success', async () => {
      await carsController.resetConversation(req, res, vi.fn());
      expect(conversationService.delete).toHaveBeenCalledWith('session-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Conversation reset' });
    });
  });
});
