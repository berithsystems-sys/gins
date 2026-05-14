import React, { useState, useEffect } from 'react';

export default function StockGroupScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [under, setUnder] = useState('');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetch(`api/stock-groups${branchId ? `?branchId=${branchId}` : ''}`)
      .then(res => res.json())
      .then(data => setGroups(data));
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/stock-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, under, branchId }),
    });
    if (response.ok) {
      alert('Stock Group Created');
      setName('');
      setUnder('');
      fetch(`api/stock-groups${branchId ? `?branchId=${branchId}` : ''}`)
        .then(res => res.json())
        .then(data => setGroups(data));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8 border-b pb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Stock Group Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Under</label>
            <select 
              value={under}
              onChange={(e) => setUnder(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            >
              <option value="">Primary</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-end justify-end">
          <button type="submit" className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-md">Accept</button>
        </div>
      </form>

      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Existing Stock Groups</h3>
        <div className="grid grid-cols-4 gap-2">
          {groups.map(g => (
            <div key={g.id} className="bg-white border-2 border-tally-teal/10 p-3 italic font-medium text-xs">
              {g.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
