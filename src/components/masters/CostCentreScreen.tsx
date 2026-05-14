import React, { useState, useEffect } from 'react';

export default function CostCentreScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [costCentres, setCostCentres] = useState<any[]>([]);

  const fetchCCs = async () => {
    const query = branchId ? `?branchId=${branchId}` : '';
    const res = await fetch(`api/cost-centres${query}`);
    const data = await res.json();
    setCostCentres(data);
  };

  useEffect(() => {
    fetchCCs();
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/cost-centres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, branchId }),
    });
    if (response.ok) {
      alert('Cost Centre Created');
      setName('');
      fetchCCs();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-[10px] font-black text-tally-teal uppercase border-b border-tally-teal/10 pb-1">Create Cost Centre</h3>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase">Name</label>
          <input 
            autoFocus
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
            required
          />
        </div>
        <button 
          type="submit"
          className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-md hover:bg-teal-700"
        >
          Accept
        </button>
      </form>

      <div className="border-l pl-8 space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase">Existing Cost Centres</h3>
        <div className="space-y-1">
          {costCentres.length === 0 && <p className="text-[10px] italic text-gray-400">No cost centres found</p>}
          {costCentres.map(cc => (
            <div key={cc.id} className="text-xs font-bold text-tally-teal py-1 border-b border-gray-50 flex justify-between">
              <span>{cc.name}</span>
              <span className="text-[10px] text-gray-400 font-normal italic">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
