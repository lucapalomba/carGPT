import { useState, useRef, useEffect } from 'react';
import type { Car } from '../App';
import ComparisonTable from './ComparisonTable';
import QASection from './QASection';
import DetailedComparison from './DetailedComparison';
import Alternatives from './Alternatives';

interface ResultsContainerProps {
  cars: Car[];
  analysisHistory: string[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
  onRefine: (feedback: string) => void;
  onNewSearch: () => void;
  isSearching: boolean;
}

function ResultsContainer({
  cars,
  analysisHistory,
  pinnedIndices,
  onTogglePin,
  onRefine,
  onNewSearch,
  isSearching
}: ResultsContainerProps) {
  const [refineInput, setRefineInput] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleRefine = () => {
    if (!refineInput.trim()) {
      alert('Please enter some feedback to refine the search.');
      return;
    }
    onRefine(refineInput.trim());
    setRefineInput('');
  };

  return (
    <div ref={resultsRef} className="space-y-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-3xl font-bold text-gray-900">🎯 Your ideal cars</h2>
        <button
          onClick={onNewSearch}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
        >
          New Search
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100">
        <div className="space-y-6">
          {analysisHistory.map((text, index) => (
            <div key={index} className="pb-6 border-b border-gray-100 last:border-0">
              <h4 className="text-indigo-600 font-bold mb-2">
                {index === 0 ? '📋 Initial Analysis' : `🔄 Refinement #${index}`}
              </h4>
              <p className="text-gray-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">💬 Refine these results:</label>
          <div className="flex gap-4">
            <input
              type="text"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 'Too expensive', 'I prefer German cars'..."
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={isSearching}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
            >
              Update
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">💡 Tip: Pin cars you like (📌) to keep them during updates.</p>
        </div>
      </div>

      <ComparisonTable 
        cars={cars} 
        pinnedIndices={pinnedIndices} 
        onTogglePin={onTogglePin} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-xl shadow-lg border border-indigo-50 flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
               <span>🔍</span> Actions
             </h3>
             <p className="text-gray-600 text-sm mb-8">What would you like to do now?</p>
           </div>
           
           <div className="space-y-4">
             <button 
                onClick={() => setShowCompare(true)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-left transition-all group"
             >
                <div className="font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">📊 Detailed comparison</div>
                <div className="text-xs text-gray-500">Compare two cars side-by-side in depth</div>
             </button>
             <button 
                onClick={() => setShowAlternatives(true)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-left transition-all group"
             >
                <div className="font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">🔄 Show alternatives</div>
                <div className="text-xs text-gray-500">Find similar models based on your favorite</div>
             </button>
           </div>
        </div>

        <div className="lg:col-span-2">
           <QASection cars={cars} />
        </div>
      </div>

      {showCompare && (
        <DetailedComparison 
          cars={cars} 
          onClose={() => setShowCompare(false)} 
        />
      )}

      {showAlternatives && (
        <Alternatives 
          cars={cars} 
          onClose={() => setShowAlternatives(false)} 
        />
      )}
    </div>
  );
}

export default ResultsContainer;
