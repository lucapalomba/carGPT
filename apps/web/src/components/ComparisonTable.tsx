import type { Car } from '../App';

interface ComparisonTableProps {
  cars: Car[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
}

function formatPropertyName(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/0to60/gi, '0-60')
    .trim();
}

function ComparisonTable({ cars, pinnedIndices, onTogglePin }: ComparisonTableProps) {
  const allPropertyKeys = Array.from(new Set(
    cars.flatMap(car => car.properties ? Object.keys(car.properties) : [])
  ));

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-6 border-b border-gray-200 bg-gray-50 sticky left-0 z-10 w-48 font-bold text-gray-700">Feature</th>
            {cars.map((car, i) => (
              <th key={i} className="p-6 border-b border-gray-200 min-w-[300px]">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Car {i + 1}</span>
                  <button
                    onClick={() => onTogglePin(i)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      pinnedIndices.has(i) 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
                  </button>
                </div>
                <div className="text-xl font-bold text-gray-900">{car.make} {car.model}</div>
                <div className="text-gray-500">{car.year}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr>
            <td className="p-6 font-bold text-gray-700 bg-gray-50 sticky left-0">Type</td>
            {cars.map((car, i) => <td key={i} className="p-6 text-gray-700">{car.type}</td>)}
          </tr>
          <tr>
            <td className="p-6 font-bold text-gray-700 bg-gray-50 sticky left-0">Price</td>
            {cars.map((car, i) => <td key={i} className="p-6 text-indigo-600 font-bold">{car.price}</td>)}
          </tr>
          {allPropertyKeys.map(key => (
            <tr key={key}>
              <td className="p-6 font-bold text-gray-700 bg-gray-50 sticky left-0">{formatPropertyName(key)}</td>
              {cars.map((car, i) => (
                <td key={i} className="p-6 text-gray-700">
                  {car.properties?.[key] || '-'}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="p-6 font-bold text-gray-700 bg-gray-50 sticky left-0">Strengths</td>
            {cars.map((car, i) => (
              <td key={i} className="p-6">
                <ul className="space-y-1">
                  {car.strengths.map((s, idx) => (
                    <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="mt-1">✅</span>
                        <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-6 font-bold text-gray-700 bg-gray-50 sticky left-0">Weaknesses</td>
            {cars.map((car, i) => (
              <td key={i} className="p-6">
                <ul className="space-y-1">
                  {car.weaknesses.map((w, idx) => (
                    <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="mt-1">❌</span>
                        <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
          <tr className="bg-indigo-50/30">
            <td className="p-6 font-bold text-gray-700 bg-indigo-50 sticky left-0">Why choose it</td>
            {cars.map((car, i) => (
              <td key={i} className="p-6 text-sm italic text-gray-600 leading-relaxed">
                {car.reason}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
