import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export interface Car {
  make: string;
  model: string;
  year: number;
  type: string;
  price: string;
  strengths: string[];
  weaknesses: string[];
  reason: string;
  pinned?: boolean;
  precise_model?: string;
  percentage: number;
  vehicle_properties?: Record<string, {
    translatedLabel: string;
    value: string;
  }>;
  images?: Array<{
    url: string;
    title: string;
    thumbnail?: string;
    source?: string;
  }>;
}

export interface SearchResponse {
  cars: Car[];
  analysis: string;
}

export const useCarSearch = () => {
  const [currentCars, setCurrentCars] = useState<Car[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'form' | 'results'>('form');

  const handleSearch = useCallback(async (requirements: string) => {
    setIsSearching(true);
    try {
      const data = await api.post<SearchResponse>('/api/find-cars', { requirements });
      
      if (data) {
        setCurrentCars(data.cars);
        setAnalysisHistory([data.analysis]);
        setView('results');
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const refineSearch = useCallback(async (feedback: string, pinnedCars: Car[] = []) => {
    setIsSearching(true);
    try {
      const data = await api.post<SearchResponse>('/api/refine-search', { feedback, pinnedCars });

      if (data) {
        setCurrentCars(data.cars);
        setAnalysisHistory(prev => [...prev, data.analysis]);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const resetSearch = useCallback(async () => {
    if (!confirm('Do you want to start a new search? Current results will be lost.')) return;

    await api.post('/api/reset-conversation', {});

    setView('form');
    setCurrentCars([]);
    setAnalysisHistory([]);
  }, []);

  return {
    currentCars,
    analysisHistory,
    isSearching,
    view,
    handleSearch,
    refineSearch,
    resetSearch,
    setCurrentCars
  };
};