import React, { useState, useEffect } from 'react';

export default function UnitOfMeasureScreen({ branchId }: { branchId?: string }) {
  const [type, setType] = useState<'Simple' | 'Compound'>('Simple');
  const [symbol, setSymbol] = useState('');
  const [formalName, setFormalName] = useState('');
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    fetch(`api/units${branchId ? `?branchId=${branchId}` : ''}`)
      .then(res => res.json())
      .then(data => setUnits(data));
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, symbol, formalName, decimalPlaces, branchId }),
    });
    if (response.ok) {
      alert('Unit of Measure Created');
      setSymbol('');
      setFormalName('');
      setDecimalPlaces(0);
      fetch(`api/units${branchId ? `?branchId=${branchId}` : ''}`)
        .then(res => res.json())
        .then(data => setUnits(data));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8 border-b pb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as 'Simple' | 'Compound')}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            >
              <option value="Simple">Simple</option>
              <option value="Compound" disabled>Compound (Coming Soon)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Symbol</label>
            <input 
              type="text" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
              placeholder="e.g. Pcs, Kgs"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Formal Name</label>
            <input 
              type="text" 
              value={formalName}
              onChange={(e) => setFormalName(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
              placeholder="e.g. Pieces, Kilograms"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Number of Decimal Places</label>
            <input 
              type="number" 
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(Number(e.target.value))}
              min="0" max="4"
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            />
          </div>
        </div>
        <div className="flex items-end justify-end">
          <button type="submit" className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-md">Accept</button>
        </div>
      </form>

      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Existing Units</h3>
        <div className="grid grid-cols-4 gap-2">
          {units.map(u => (
            <div key={u.id} className="bg-white border-2 border-tally-teal/10 p-3 text-center">
              <div className="text-lg font-bold text-tally-teal">{u.symbol}</div>
              <div className="text-[10px] text-gray-500 uppercase">{u.formalName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
