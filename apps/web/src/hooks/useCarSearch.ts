import { useState, useCallback, useRef, useEffect } from 'react';
import { carSearchService } from '../services/CarSearchService';
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
    const sessionId = `session-${Date.now()}`; // Generate session ID
    pendingRequestsRef.current.add(requestId);
    
    setIsSearching(true);
    try {
      // Validate requirements before sending
      if (!carSearchService.validateSearchRequirements(requirements)) {
        throw new Error('Please provide valid search requirements (3-1000 characters)');
      }
      
      const data = await carSearchService.findCars(requirements, sessionId);
      
      // Check if request is still valid (not cancelled)
      if (pendingRequestsRef.current.has(requestId)) {
        if (data) {
          setCurrentCars(data.cars);
          setAnalysisHistory([data.analysis]);
          setView('results');
          
          // Update conversation data
          const newHistory = [data.analysis];
          carSearchService.updateConversationData(
            sessionId, 
            data.cars, 
            newHistory, 
            new Set()
          );
        }
      }
    } catch (error) {
      if (pendingRequestsRef.current.has(requestId)) {
        console.error('Search error:', error);
        throw error; // Re-throw for component to handle
      }
    } finally {
      pendingRequestsRef.current.delete(requestId);
      setIsSearching(false);
    }
  }, []);

  const refineSearch = useCallback(async (feedback: string, pinnedCars: Car[] = []) => {
    const requestId = `refine-${Date.now()}`;
    const sessionId = `session-${Date.now()}`; // Generate session ID
    pendingRequestsRef.current.add(requestId);
    
    setIsSearching(true);
    try {
      // Validate feedback before sending
      if (!carSearchService.validateFeedback(feedback)) {
        throw new Error('Please provide valid feedback (3-500 characters)');
      }
      
      const data = await carSearchService.refineSearch(feedback, pinnedCars, sessionId);

      // Check if request is still valid (not cancelled)
      if (pendingRequestsRef.current.has(requestId)) {
        if (data) {
          setCurrentCars(data.cars);
          setAnalysisHistory(prev => [...prev, data.analysis]);
          
          // Update conversation data
          const newHistory = [...analysisHistory, data.analysis];
          carSearchService.updateConversationData(
            sessionId, 
            data.cars, 
            newHistory, 
            new Set()
          );
        }
      }
    } catch (error) {
      if (pendingRequestsRef.current.has(requestId)) {
        console.error('Refine error:', error);
        throw error; // Re-throw for component to handle
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
      await carSearchService.resetConversation();
      
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