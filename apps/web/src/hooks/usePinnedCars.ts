import { useState, useCallback, useEffect } from 'react';
import type { Car } from './useCarSearch';

export const usePinnedCars = (currentCars: Car[]) => {
  const [pinnedIndices, setPinnedIndices] = useState<Set<number>>(new Set());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear pinned state when component unmounts
      setPinnedIndices(new Set());
    };
  }, []);

  const togglePin = useCallback((index: number) => {
    const next = new Set(pinnedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setPinnedIndices(next);
  }, [pinnedIndices]);

  const updatePinnedIndices = useCallback((cars: Car[]) => {
    const newPinned = new Set<number>();
    cars.forEach((car, index) => {
      if (car.pinned) {
        newPinned.add(index);
      }
    });
    setPinnedIndices(newPinned);
  }, []);

  const getPinnedCars = useCallback(() => {
    return Array.from(pinnedIndices).map(idx => currentCars[idx]).filter(Boolean);
  }, [pinnedIndices, currentCars]);

  return {
    pinnedIndices,
    togglePin,
    updatePinnedIndices,
    getPinnedCars
  };
};