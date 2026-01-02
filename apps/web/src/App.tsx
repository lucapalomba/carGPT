import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import InitialForm from './components/InitialForm';
import ResultsContainer from './components/ResultsContainer';
import { api } from './utils/api';

export interface Car {
  make: string;
  model: string;
  year: number;
  type: string;
  price: string;
  strengths: string[];
  weaknesses: string[];
  reason: string;
  properties?: Record<string, any>;
  images?: Array<{
    url: string;
    title: string;
    thumbnail?: string;
    source?: string;
  }>;
}

interface SearchResponse {
  cars: Car[];
  analysis: string;
}

function App() {
  const [currentCars, setCurrentCars] = useState<Car[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<string[]>([]);
  const [pinnedIndices, setPinnedIndices] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'form' | 'results'>('form');

  const handleSearch = async (requirements: string) => {
    setIsSearching(true);
    const data = await api.post<SearchResponse>('/api/find-cars', { requirements });
    
    if (data) {
      setCurrentCars(data.cars);
      setAnalysisHistory([data.analysis]);
      setPinnedIndices(new Set());
      setView('results');
    }
    
    setIsSearching(false);
  };

  const refineSearch = async (feedback: string) => {
    const pinnedCars = Array.from(pinnedIndices).map(idx => currentCars[idx]).filter(Boolean);
    
    setIsSearching(true);
    const data = await api.post<SearchResponse>('/api/refine-search', { feedback, pinnedCars });

    if (data) {
      setCurrentCars(data.cars);
      setAnalysisHistory(prev => [...prev, data.analysis]);
      
      // Pinned cars should still be pinned. They are now at 0, 1, ...
      const newPinned = new Set<number>();
      for (let i = 0; i < pinnedCars.length; i++) {
        newPinned.add(i);
      }
      setPinnedIndices(newPinned);
    }

    setIsSearching(false);
  };

  const resetSearch = async () => {
    if (!confirm('Do you want to start a new search? Current results will be lost.')) return;

    await api.post('/api/reset-conversation', {});

    setView('form');
    setCurrentCars([]);
    setAnalysisHistory([]);
    setPinnedIndices(new Set());
  };

  const togglePin = (index: number) => {
    const next = new Set(pinnedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setPinnedIndices(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {view === 'form' ? (
          <InitialForm onSearch={handleSearch} isSearching={isSearching} />
        ) : (
          <ResultsContainer 
            cars={currentCars} 
            analysisHistory={analysisHistory} 
            pinnedIndices={pinnedIndices}
            onTogglePin={togglePin}
            onRefine={refineSearch}
            onNewSearch={resetSearch}
            isSearching={isSearching}
          />
        )}
      </div>
    </div>
  );
}

export default App;
