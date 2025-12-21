import { useState } from 'react';
import type { Car } from '../App';

interface AlternativesProps {
  cars: Car[];
  onClose: () => void;
}

interface AlternativeCar {
  make: string;
  model: string;
  reason: string;
  advantages: string;
}

function Alternatives({ cars, onClose }: AlternativesProps) {
  const [selectedCar, setSelectedCar] = useState('');
  const [reason, setReason] = useState('');
  const [alternatives, setAlternatives] = useState<AlternativeCar[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!selectedCar) {
      alert('Please select a car');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/get-alternatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language
        },
        body: JSON.stringify({ car: selectedCar, reason })
      });

      const data = await response.json();
      if (data.success) {
        setAlternatives(data.alternatives);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">🔄 Similar Alternatives</h3>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
            >
              <option value="">Select a car you like...</option>
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </select>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Why are you looking for alternatives? (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isLoading ? 'Searching...' : 'Find Alternatives'}
            </button>
          </div>

          <div className="space-y-4">
            {alternatives.map((alt, i) => (
              <div key={i} className="p-6 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all">
                <h4 className="text-lg font-bold text-indigo-700 mb-2">{i + 1}. {alt.make} {alt.model}</h4>
                <div className="space-y-2 text-sm">
                  <p><strong className="text-gray-700">Why consider it:</strong> {alt.reason}</p>
                  <p><strong className="text-gray-700">Advantages:</strong> {alt.advantages}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Alternatives;
