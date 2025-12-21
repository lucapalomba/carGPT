import { useState } from 'react';
import InitialForm from './components/InitialForm';
import ResultsContainer from './components/ResultsContainer';

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
}

function App() {
  const [currentCars, setCurrentCars] = useState<Car[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<string[]>([]);
  const [pinnedIndices, setPinnedIndices] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'form' | 'results'>('form');

  const handleSearch = async (requirements: string) => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/find-cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language
        },
        body: JSON.stringify({ requirements })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCars(data.cars);
        setAnalysisHistory([data.analysis]);
        setPinnedIndices(new Set());
        setView('results');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Connection error. Make sure Ollama is running.');
    } finally {
      setIsSearching(false);
    }
  };

  const refineSearch = async (feedback: string) => {
    const pinnedCars = Array.from(pinnedIndices).map(idx => currentCars[idx]).filter(Boolean);
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/refine-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language
        },
        body: JSON.stringify({ feedback, pinnedCars })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCars(data.cars);
        setAnalysisHistory(prev => [...prev, data.analysis]);
        
        // Pinned cars should still be pinned. They are now at 0, 1, ...
        const newPinned = new Set<number>();
        for (let i = 0; i < pinnedCars.length; i++) {
          newPinned.add(i);
        }
        setPinnedIndices(newPinned);
      } else {
        alert('Error refining search: ' + data.error);
      }
    } catch (error) {
      console.error('Refine error:', error);
      alert('Connection error.');
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = async () => {
    if (!confirm('Do you want to start a new search? Current results will be lost.')) return;

    try {
      await fetch('/api/reset-conversation', { method: 'POST' });
    } catch (error) {
      console.error('Reset error:', error);
    }

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
