import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/CarSearchService.js', () => ({
  carSearchService: {
    findCars: vi.fn(),
    refineSearch: vi.fn(),
    resetConversation: vi.fn(),
    validateSearchRequirements: vi.fn(),
    validateFeedback: vi.fn(),
    updateConversationData: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../components/ui/confirm-dialog.js', () => ({
  confirm: vi.fn(),
}));

import { carSearchService } from '../../services/CarSearchService.js';
import { confirm } from '../../components/ui/confirm-dialog.js';
import { useCarSearch } from '../useCarSearch.js';
import type { Car } from '../useCarSearch.js';

const cars: Car[] = [{ make: 'Tesla', model: '3', year: 2023 } as Car];

describe('useCarSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (carSearchService.updateConversationData as any).mockResolvedValue(undefined);
  });

  it('starts on the form view with no cars', () => {
    const { result } = renderHook(() => useCarSearch());
    expect(result.current.view).toBe('form');
    expect(result.current.currentCars).toEqual([]);
    expect(result.current.analysisHistory).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('handleSearch moves to results and stores cars + analysis on success', async () => {
    (carSearchService.validateSearchRequirements as any).mockReturnValue(true);
    (carSearchService.findCars as any).mockResolvedValue({
      cars,
      analysis: 'initial analysis',
    });

    const { result } = renderHook(() => useCarSearch());

    await act(async () => {
      await result.current.handleSearch('I need a car');
    });

    expect(result.current.view).toBe('results');
    expect(result.current.currentCars).toEqual(cars);
    expect(result.current.analysisHistory).toEqual(['initial analysis']);
    expect(result.current.isSearching).toBe(false);
  });

  it('handleSearch throws and stays on the form when validation fails', async () => {
    (carSearchService.validateSearchRequirements as any).mockReturnValue(false);

    const { result } = renderHook(() => useCarSearch());

    await expect(act(async () => {
      await result.current.handleSearch('ab');
    })).rejects.toThrow(/valid search requirements/);

    expect(result.current.view).toBe('form');
  });

  it('handleSearch throws when findCars fails', async () => {
    (carSearchService.validateSearchRequirements as any).mockReturnValue(true);
    (carSearchService.findCars as any).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCarSearch());

    await expect(act(async () => {
      await result.current.handleSearch('I need a car');
    })).rejects.toThrow('boom');

    expect(result.current.view).toBe('form');
  });

  it('refineSearch appends analysis and replaces cars', async () => {
    (carSearchService.validateSearchRequirements as any).mockReturnValue(true);
    (carSearchService.validateFeedback as any).mockReturnValue(true);
    (carSearchService.findCars as any).mockResolvedValue({
      cars,
      analysis: 'initial',
    });
    const refinedCars: Car[] = [{ make: 'BMW', model: 'i4', year: 2024 } as Car];
    (carSearchService.refineSearch as any).mockResolvedValue({
      cars: refinedCars,
      analysis: 'refined',
    });

    const { result } = renderHook(() => useCarSearch());

    await act(async () => {
      await result.current.handleSearch('I need a car');
    });
    await act(async () => {
      await result.current.refineSearch('cheaper', []);
    });

    expect(result.current.currentCars).toEqual(refinedCars);
    expect(result.current.analysisHistory).toEqual(['initial', 'refined']);
  });

  it('refineSearch throws when feedback validation fails', async () => {
    (carSearchService.validateFeedback as any).mockReturnValue(false);

    const { result } = renderHook(() => useCarSearch());

    await expect(act(async () => {
      await result.current.refineSearch('ab');
    })).rejects.toThrow(/valid feedback/);
  });

  it('resetSearch does nothing when the user cancels the confirm dialog', async () => {
    (confirm as any).mockResolvedValue(false);
    (carSearchService.validateSearchRequirements as any).mockReturnValue(true);
    (carSearchService.findCars as any).mockResolvedValue({ cars, analysis: 'a' });

    const { result } = renderHook(() => useCarSearch());
    await act(async () => {
      await result.current.handleSearch('I need a car');
    });
    expect(result.current.view).toBe('results');

    await act(async () => {
      await result.current.resetSearch();
    });

    expect(result.current.view).toBe('results');
    expect(carSearchService.resetConversation).not.toHaveBeenCalled();
  });

  it('resetSearch returns to the form when the user confirms', async () => {
    (confirm as any).mockResolvedValue(true);
    (carSearchService.resetConversation as any).mockResolvedValue(undefined);
    (carSearchService.validateSearchRequirements as any).mockReturnValue(true);
    (carSearchService.findCars as any).mockResolvedValue({ cars, analysis: 'a' });

    const { result } = renderHook(() => useCarSearch());
    await act(async () => {
      await result.current.handleSearch('I need a car');
    });

    await act(async () => {
      await result.current.resetSearch();
    });

    await waitFor(() => expect(result.current.view).toBe('form'));
    expect(result.current.currentCars).toEqual([]);
    expect(result.current.analysisHistory).toEqual([]);
    expect(carSearchService.resetConversation).toHaveBeenCalled();
  });

  it('resetSearch shows an error toast when resetConversation fails', async () => {
    const { toast } = await import('react-hot-toast');
    (confirm as any).mockResolvedValue(true);
    (carSearchService.resetConversation as any).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCarSearch());

    await act(async () => {
      await result.current.resetSearch();
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to reset search');
  });
});