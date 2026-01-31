import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElaborationService } from '../elaborationService.js';
import { config } from '../../../config/index.js';
import logger from '../../../utils/logger.js';
import { ElaborationSchema } from '../../../utils/schemas.js';

// Mock external dependencies
vi.mock('../../../config/index.js', () => ({
  config: {
    sequentialPromiseExecution: false, // Default to parallel for tests
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/dateUtils.js', () => ({
  getDateSystemMessage: vi.fn().mockReturnValue('mock-date'),
}));

describe('ElaborationService', () => {
  let elaborationService: ElaborationService;
  let mockOllamaService: any;
  let mockPromptService: any;
  let mockTrace: any;
  // A map to store end mocks for different span instances
  const spanEndMocks = new Map<string, any>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOllamaService = { callOllamaStructured: vi.fn() };
    mockPromptService = { loadTemplate: vi.fn().mockReturnValue('mock-template-content') };
    elaborationService = new ElaborationService(mockOllamaService, mockPromptService);

    // Reset config to default parallel
    config.sequentialPromiseExecution = false; 

    mockTrace = {
      span: vi.fn((options) => {
        const endMock = vi.fn();
        const spanInstance = {
          end: endMock,
          update: vi.fn(),
        };
        // Store the end mock by a unique ID or name
        spanEndMocks.set(options.name, endMock);
        return spanInstance;
      }),
    };
    spanEndMocks.clear(); // Clear between tests
  });

  // Helper to retrieve a specific end mock
  const getSpanEndMock = (spanName: string) => {
    return spanEndMocks.get(spanName);
  };


  const mockSearchIntent = { type: 'recommendation', criteria: {} };
  const mockElaborationResult = (car: any) => ({
    power: '120hp',
    color: 'Red',
    features: ['ABS', 'Airbags']
  });
  const mockInvalidElaborationResult = { some_invalid_field: 'value' };

  describe('elaborateCars - Parallel Execution', () => {
    it('should elaborate a list of car choices successfully in parallel', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured.mockImplementation((messages: any[], schema: any, type: string, trace: any, spanName: string) => {
        const carChoice = JSON.parse(messages[2].content.replace('Current car to elaborate: ', ''));
        return Promise.resolve(mockElaborationResult(carChoice));
      });

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(expect.objectContaining({ ...mockCarChoices[1], ...mockElaborationResult(mockCarChoices[1]) }));
      expect(mockTrace.span).toHaveBeenCalledWith(expect.objectContaining({ name: 'elaborate_cars_parallel' }));
      expect(getSpanEndMock('elaborate_cars_parallel')).toHaveBeenCalledWith(expect.objectContaining({ output: { count: 2 } }));
    });

    it('should fallback to original car if elaboration fails in parallel', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured
        .mockResolvedValueOnce(mockElaborationResult(mockCarChoices[0]))
        .mockRejectedValueOnce(new Error('Ollama error for Honda'));

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(mockCarChoices[1]); // Fallback to original (unmodified)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elaboration failed for Honda Civic'),
        expect.any(Object)
      );
    });

    it('should fallback to original car if elaboration returns invalid structure in parallel', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured
        .mockResolvedValueOnce(mockElaborationResult(mockCarChoices[0]))
        .mockRejectedValueOnce(new Error('Invalid elaboration structure from Ollama')); // Simulate an error for invalid structure

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(mockCarChoices[1]); // Fallback to original (unmodified)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elaboration failed for Honda Civic'),
        expect.any(Object)
      );
    });
    
    it('should handle legacy "car" wrapper from ollamaService output', async () => {
      const mockCarChoices = [{ make: "Toyota", model: "Corolla", year: 2020 }];
      mockOllamaService.callOllamaStructured.mockResolvedValue({ car: mockElaborationResult(mockCarChoices[0]) });

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);
      
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
    });
  });

  describe('elaborateCars - Sequential Execution', () => {
    beforeEach(() => {
      config.sequentialPromiseExecution = true; // Enable sequential execution
    });

    it('should elaborate a list of car choices successfully in sequential mode', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured.mockImplementation((messages: any[], schema: any, type: string, trace: any, spanName: string) => {
        const carChoice = JSON.parse(messages[2].content.replace('Current car to elaborate: ', ''));
        return Promise.resolve(mockElaborationResult(carChoice));
      });

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(expect.objectContaining({ ...mockCarChoices[1], ...mockElaborationResult(mockCarChoices[1]) }));
      expect(mockTrace.span).toHaveBeenCalledWith(expect.objectContaining({ name: 'elaborate_cars_parallel' }));
      expect(getSpanEndMock('elaborate_cars_parallel')).toHaveBeenCalledWith(expect.objectContaining({ output: { count: 2 } }));
    });

    it('should fallback to original car if elaboration fails in sequential mode', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured
        .mockResolvedValueOnce(mockElaborationResult(mockCarChoices[0]))
        .mockRejectedValueOnce(new Error('Ollama error for Honda'));

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(mockCarChoices[1]); // Fallback to original (unmodified)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elaboration failed for Honda Civic'),
        expect.any(Object)
      );
    });

    it('should fallback to original car if elaboration returns invalid structure in sequential mode', async () => {
      const mockCarChoices = [
        { make: "Toyota", model: "Corolla", year: 2020 },
        { make: "Honda", model: "Civic", year: 2021 },
      ];
      mockOllamaService.callOllamaStructured
        .mockResolvedValueOnce(mockElaborationResult(mockCarChoices[0]))
        .mockRejectedValueOnce(new Error('Invalid elaboration structure from Ollama')); // Simulate an error for invalid structure

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);

      expect(mockOllamaService.callOllamaStructured).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
      expect(result[1]).toEqual(mockCarChoices[1]); // Fallback to original (unmodified)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elaboration failed for Honda Civic'),
        expect.any(Object)
      );
    });
    
    it('should handle legacy "car" wrapper from ollamaService output in sequential mode', async () => {
      const mockCarChoices = [{ make: "Toyota", model: "Corolla", year: 2020 }];
      mockOllamaService.callOllamaStructured.mockResolvedValue({ car: mockElaborationResult(mockCarChoices[0]) });

      const result = await elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace);
      
      expect(result[0]).toEqual(expect.objectContaining({ ...mockCarChoices[0], ...mockElaborationResult(mockCarChoices[0]) }));
    });
  });

  it('should handle top-level error in elaborateCars', async () => {
    const mockCarChoices = [
      { make: "Toyota", model: "Corolla", year: 2020 },
    ];
    mockPromptService.loadTemplate.mockImplementation(() => {
      throw new Error('Template loading error');
    });

    // We expect the span to be created at the beginning of elaborateCars
    // and its end method to be called upon error.
    await expect(elaborationService.elaborateCars(mockCarChoices, mockSearchIntent, mockTrace))
      .rejects
      .toThrow('Template loading error');
    
    expect(mockTrace.span).toHaveBeenCalledWith(expect.objectContaining({ name: 'elaborate_cars_parallel' }));
    // Retrieve the end mock of the span that was actually created
    const endMock = getSpanEndMock('elaborate_cars_parallel');
    expect(endMock).toHaveBeenCalledWith(expect.objectContaining({ level: 'ERROR' }));
  });
});
