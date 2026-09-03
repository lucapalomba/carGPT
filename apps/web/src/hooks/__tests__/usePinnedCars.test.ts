import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedCars } from '../usePinnedCars.js';
import type { Car } from '../useCarSearch.js';

const cars: Car[] = [
  { make: 'Tesla', model: '3', year: 2023 } as Car,
  { make: 'BMW', model: 'i4', year: 2024 } as Car,
  { make: 'Hyundai', model: 'Ioniq 5', year: 2023 } as Car,
];

describe('usePinnedCars', () => {
  it('starts with no pinned cars', () => {
    const { result } = renderHook(() => usePinnedCars(cars));
    expect(result.current.pinnedIndices.size).toBe(0);
    expect(result.current.getPinnedCars()).toEqual([]);
  });

  it('togglePin adds and removes an index', () => {
    const { result } = renderHook(() => usePinnedCars(cars));

    act(() => result.current.togglePin(1));
    expect(result.current.pinnedIndices.has(1)).toBe(true);
    expect(result.current.getPinnedCars()).toHaveLength(1);
    expect(result.current.getPinnedCars()[0]).toMatchObject({ make: 'BMW' });

    act(() => result.current.togglePin(1));
    expect(result.current.pinnedIndices.has(1)).toBe(false);
    expect(result.current.getPinnedCars()).toEqual([]);
  });

  it('can pin multiple cars at once', () => {
    const { result } = renderHook(() => usePinnedCars(cars));

    act(() => result.current.togglePin(0));
    act(() => result.current.togglePin(2));
    expect(result.current.getPinnedCars()).toHaveLength(2);
    expect(result.current.getPinnedCars().map((c) => c.make)).toEqual(['Tesla', 'Hyundai']);
  });

  it('updatePinnedIndices rebuilds the set from car.pinned flags', () => {
    const withPinned: Car[] = [
      { make: 'Tesla', model: '3', year: 2023, pinned: true } as Car,
      { make: 'BMW', model: 'i4', year: 2024 } as Car,
      { make: 'Hyundai', model: 'Ioniq 5', year: 2023, pinned: true } as Car,
    ];
    const { result } = renderHook(() => usePinnedCars(withPinned));

    act(() => result.current.updatePinnedIndices(withPinned));
    expect(result.current.pinnedIndices.has(0)).toBe(true);
    expect(result.current.pinnedIndices.has(2)).toBe(true);
    expect(result.current.pinnedIndices.has(1)).toBe(false);
    expect(result.current.getPinnedCars()).toHaveLength(2);
  });

  it('getPinnedCars ignores out-of-range indices', () => {
    const { result } = renderHook(() => usePinnedCars(cars));
    act(() => result.current.togglePin(99));
    expect(result.current.getPinnedCars()).toEqual([]);
  });
});