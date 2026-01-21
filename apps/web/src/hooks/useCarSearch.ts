import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import type { Car, SearchResponse as SharedSearchResponse } from '../../../server/src/services/ai/types';

// Legacy export for backward compatibility
export type { Car };

export interface SearchResponse extends SharedSearchResponse {
  analysis: string;
}

export const useCarSearch = () => {
  const [currentCars, setCurrentCars] = useState<Car[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'form' | 'results'>('form');
  
  // Track pending requests to prevent memory leaks
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  const handleSearch = useCallback(async (requirements: string) => {
    const requestId = `search-${Date.now()}`;
    pendingRequestsRef.current.add(requestId);
    
    setIsSearching(true);
    try {
      const data = await api.post<SearchResponse>('/api/find-cars', { requirements });
      
      // Check if request is still valid (not cancelled)
      if (pendingRequestsRef.current.has(requestId)) {
        if (data) {
          setCurrentCars(data.cars);
          setAnalysisHistory([data.analysis]);
          setView('results');
        }
      }
    } catch (error) {
      if (pendingRequestsRef.current.has(requestId)) {
        console.error('Search error:', error);
      }
    } finally {
      pendingRequestsRef.current.delete(requestId);
      setIsSearching(false);
    }
  }, []);

  const refineSearch = useCallback(async (feedback: string, pinnedCars: Car[] = []) => {
    const requestId = `refine-${Date.now()}`;
    pendingRequestsRef.current.add(requestId);
    
    setIsSearching(true);
    try {
      const data = await api.post<SearchResponse>('/api/refine-search', { feedback, pinnedCars });

      // Check if request is still valid (not cancelled)
      if (pendingRequestsRef.current.has(requestId)) {
        if (data) {
          setCurrentCars(data.cars);
          setAnalysisHistory(prev => [...prev, data.analysis]);
        }
      }
    } catch (error) {
      if (pendingRequestsRef.current.has(requestId)) {
        console.error('Refine error:', error);
      }
    } finally {
      pendingRequestsRef.current.delete(requestId);
      setIsSearching(false);
    }
  }, []);

  const resetSearch = useCallback(async () => {
    // Cancel all pending requests
    pendingRequestsRef.current.clear();
    
    if (!confirm('Do you want to start a new search? Current results will be lost.')) return;

    try {
      await api.post('/api/reset-conversation', {});
      
      // Reset all states
      setView('form');
      setCurrentCars([]);
      setAnalysisHistory([]);
    } catch (error) {
      console.error('Reset error:', error);
    }
  }, []);

  // Cleanup function to cancel pending requests on unmount
  useEffect(() => {
    return () => {
      pendingRequestsRef.current.clear();
    };
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