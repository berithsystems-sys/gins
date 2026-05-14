import React, { useState, useEffect } from 'react';

export default function AccountGroupScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [under, setUnder] = useState('');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetch(`api/account-groups${branchId ? `?branchId=${branchId}` : ''}`)
      .then(res => res.json())
      .then(data => setGroups(data));
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/account-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, under, branchId }),
    });
    if (response.ok) {
      alert('Account Group Created');
      setName('');
      setUnder('');
      // Refresh groups list
      fetch(`api/account-groups${branchId ? `?branchId=${branchId}` : ''}`)
        .then(res => res.json())
        .then(data => setGroups(data));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8 border-b pb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Group Name</label>
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
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Existing Groups</h3>
        <div className="grid grid-cols-3 gap-2 overflow-auto max-h-60">
          {groups.map(g => (
            <div key={g.id} className="bg-gray-50 border p-2 text-xs font-medium">
              {g.name} <span className="text-gray-400 font-normal italic">Under: {groups.find(pg => pg.id === g.under)?.name || 'Primary'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
