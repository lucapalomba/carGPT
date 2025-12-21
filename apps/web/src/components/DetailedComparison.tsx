import { useState } from 'react';
import type { Car } from '../App';

interface DetailedComparisonProps {
  cars: Car[];
  onClose: () => void;
}

interface ComparisonResult {
  comparison: string;
  categories: {
    name: string;
    car1: string;
    car2: string;
    winner: 'car1' | 'car2' | 'none';
  }[];
  conclusion: string;
}

function DetailedComparison({ cars, onClose }: DetailedComparisonProps) {
  const [car1Name, setCar1Name] = useState('');
  const [car2Name, setCar2Name] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompare = async () => {
    if (!car1Name || !car2Name) {
      alert('Please select two cars to compare');
      return;
    }
    if (car1Name === car2Name) {
      alert('Please select two different cars');
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/compare-cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language
        },
        body: JSON.stringify({ car1: car1Name, car2: car2Name })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.comparison);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">📊 Detailed Comparison</h3>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <select
              className="flex-1 w-full p-3 border border-gray-300 rounded-lg"
              value={car1Name}
              onChange={(e) => setCar1Name(e.target.value)}
            >
              <option value="">First car...</option>
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </select>
            <span className="text-xl font-bold text-gray-400">VS</span>
            <select
              className="flex-1 w-full p-3 border border-gray-300 rounded-lg"
              value={car2Name}
              onChange={(e) => setCar2Name(e.target.value)}
            >
              <option value="">Second car...</option>
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </select>
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 text-indigo-900 italic">
                {result.comparison}
              </div>

              <div className="space-y-6">
                {result.categories.map((cat, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <h4 className="bg-gray-50 p-4 font-bold text-gray-700 border-b border-gray-100">{cat.name}</h4>
                    <div className="grid grid-cols-2">
                      <div className={`p-4 border-r border-gray-100 ${cat.winner === 'car1' ? 'bg-green-50' : ''}`}>
                        <div className="text-xs font-bold text-gray-400 mb-1">{car1Name}</div>
                        <div className="text-gray-700">{cat.car1}</div>
                        {cat.winner === 'car1' && <span className="text-xs font-bold text-green-600 mt-2 block">🏆 Winner</span>}
                      </div>
                      <div className={`p-4 ${cat.winner === 'car2' ? 'bg-green-50' : ''}`}>
                        <div className="text-xs font-bold text-gray-400 mb-1">{car2Name}</div>
                        <div className="text-gray-700">{cat.car2}</div>
                        {cat.winner === 'car2' && <span className="text-xs font-bold text-green-600 mt-2 block">🏆 Winner</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-gray-900 text-white rounded-xl">
                <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <span>🏆</span> Conclusion
                </h4>
                <p className="text-gray-300 leading-relaxed">{result.conclusion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailedComparison;
