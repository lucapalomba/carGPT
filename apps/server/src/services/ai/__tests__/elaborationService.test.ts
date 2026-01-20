import { describe, it, expect, vi, beforeEach } from 'vitest';
import { elaborationService } from '../elaborationService.js';
import { ollamaService } from '../../ollamaService.js';
import { promptService } from '../../promptService.js';

vi.mock('../../ollamaService.js');
vi.mock('../../promptService.js');

describe('elaborationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('elaborateCars', () => {
    it('should fallback to original car if individual elaboration fails', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (ollamaService.callOllama as any).mockRejectedValue(new Error('Elaboration error'));
        
        const cars = [{ make: 'Toyota', model: 'Camry', year: 2020 }];
        const result = await elaborationService.elaborateCars(cars, {}, mockTrace);
        
        expect(result[0]).toEqual(cars[0]);
    });

    it('should elaborate cars successfully with flat structure', async () => {
        const mockTrace = { span: vi.fn().mockReturnValue({ end: vi.fn() }) };
        (promptService.loadTemplate as any).mockReturnValue('template');
        (ollamaService.callOllama as any).mockResolvedValue('{"price": "1000"}');
        (ollamaService.parseJsonResponse as any).mockReturnValue({ price: "1000" });

        const cars = [{ make: 'Toyota', model: 'Camry', year: 2020 }];
        const result = await elaborationService.elaborateCars(cars, {}, mockTrace);
        
        expect(result[0]).toEqual({ ...cars[0], price: "1000" });
    });
  });
});
