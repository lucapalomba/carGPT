import { useState } from 'react';

interface InitialFormProps {
  onSearch: (requirements: string) => void;
  isSearching: boolean;
}

const EXAMPLES = [
  "Looking for a reliable family car with:\n- Space for 2 adults and 2 kids\n- Large trunk (3 suitcases minimum)\n- Good safety ratings\n- Economical for daily 50km commute\n- Budget: €25,000-35,000",
  "Need a compact car for city driving:\n- Easy to park\n- Low fuel consumption\n- Nimble in traffic\n- Budget-friendly (under €20k)\n- Hybrid preferred",
  "Looking for a robust SUV for outdoor adventures:\n- 4x4 capability\n- Good ground clearance\n- Reliable in tough conditions\n- Can handle dirt roads and snow\n- Budget: up to €40,000"
];

function InitialForm({ onSearch, isSearching }: InitialFormProps) {
  const [requirements, setRequirements] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.trim().length < 10) {
      alert('Please describe your requirements in more detail (at least 10 characters)');
      return;
    }
    onSearch(requirements.trim());
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <img src="/cargpt_logo.jpeg" alt="CarGPT Logo" className="h-full object-contain" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CarGPT</h1>
        <p className="text-gray-600">Describe what you're looking for in a car and we'll suggest the perfect models for you</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
            Describe your requirements
          </label>
          <textarea
            id="requirements"
            rows={6}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Example: Looking for a family car with space for 5 people..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            required
          />
          <p className="mt-2 text-sm text-gray-500">The more specific you are, the better the suggestions! 💡</p>
        </div>

        <div className="space-y-4">
          <p className="font-semibold text-gray-700">Example prompts:</p>
          {EXAMPLES.map((example, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left p-4 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              onClick={() => setRequirements(example)}
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg shadow-md transition-colors flex justify-center items-center gap-3"
        >
          {isSearching ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing your requirements...</span>
            </>
          ) : (
            'Find my perfect cars'
          )}
        </button>
      </form>
    </div>
  );
}

export default InitialForm;
