import { useState, useRef, useEffect } from 'react';
import type { Car } from '../App';
import { api } from '../utils/api';

interface QASectionProps {
  cars: Car[];
}

interface QAMessage {
  type: 'question' | 'answer';
  text: string;
  carName?: string;
  isError?: boolean;
}

function QASection({ cars }: QASectionProps) {
  const [selectedCarIdx, setSelectedCarIdx] = useState('');
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const handleAsk = async () => {
    if (!selectedCarIdx || !question.trim()) {
      alert('Please select a car and write a question');
      return;
    }

    const car = cars[parseInt(selectedCarIdx)];
    const carName = `${car.make} ${car.model}`;
    const userQuestion = question.trim();

    setHistory(prev => [...prev, { type: 'question', text: userQuestion, carName }]);
    setQuestion('');
    setIsLoading(true);

    const data = await api.post('/api/ask-about-car', { car: carName, question: userQuestion });
    if (data) {
      setHistory(prev => [...prev, { type: 'answer', text: data.answer }]);
    } else {
      // api utility already toasted the error, we just add it to history for UI flow
      setHistory(prev => [...prev, { type: 'answer', text: 'Operation failed', isError: true }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 flex flex-col h-[500px]">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span>💬</span> Have questions about these cars?
      </h3>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="flex-[2] p-3 border border-gray-300 rounded-lg text-sm"
            value={selectedCarIdx}
            onChange={(e) => setSelectedCarIdx(e.target.value)}
          >
            <option value="">Select a car...</option>
            {cars.map((car, i) => (
              <option key={i} value={i}>{car.make} {car.model}</option>
            ))}
          </select>
          <input
            type="text"
            className="flex-[5] p-3 border border-gray-300 rounded-lg text-sm"
            placeholder="e.g. What's the annual maintenance cost?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            Ask
          </button>
        </div>
      </div>

      <div 
        ref={historyRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100"
      >
        {history.length === 0 && (
          <div className="text-center text-gray-400 mt-20 italic">
            Questions and answers will appear here
          </div>
        )}
        {history.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.type === 'question' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                msg.type === 'question' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : msg.isError 
                  ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none'
                  : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'
              }`}
            >
              {msg.type === 'question' && (
                <div className="text-[10px] font-bold uppercase opacity-70 mb-1">{msg.carName}</div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
              <span className="text-xs text-gray-400 italic">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QASection;
