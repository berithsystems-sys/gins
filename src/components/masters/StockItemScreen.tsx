import React, { useState, useEffect } from 'react';

export default function StockItemScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [under, setUnder] = useState('');
  const [unitId, setUnitId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [ratePerUnit, setRatePerUnit] = useState('0');

  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch(`api/stock-groups${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json()).then(setStockGroups);
    fetch(`api/units${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json()).then(setUnits);
    fetch(`api/stock-items${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json()).then(setItems);
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/stock-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, alias, under, unitId, 
        openingBalance: Number(openingBalance), 
        ratePerUnit: Number(ratePerUnit), 
        branchId 
      }),
    });
    if (response.ok) {
      alert('Stock Item Created');
      setName('');
      setAlias('');
      setOpeningBalance('0');
      setRatePerUnit('0');
      fetch(`api/stock-items${branchId ? `?branchId=${branchId}` : ''}`).then(res => res.json()).then(setItems);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 border-b pb-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1 font-bold text-tally-teal uppercase" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Alias</label>
              <input type="text" value={alias} onChange={e => setAlias(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1 font-bold text-tally-teal" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Under (Stock Group)</label>
              <select value={under} onChange={e => setUnder(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1" required>
                <option value="">Primary</option>
                {stockGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Units</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1" required>
                <option value="">Not Applicable</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.symbol}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4 border-l pl-8">
            <h4 className="text-[10px] font-bold uppercase text-gray-400">Opening Balance Details</h4>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Quantity</label>
              <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1 text-right" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase">Rate per Unit</label>
              <input type="number" value={ratePerUnit} onChange={e => setRatePerUnit(e.target.value)} className="w-full border-b border-tally-teal focus:outline-none p-1 text-right" />
            </div>
            <div className="pt-4 text-right">
              <span className="text-xs font-bold text-gray-500 uppercase">Value: </span>
              <span className="text-lg font-bold text-tally-teal">₹{(Number(openingBalance) * Number(ratePerUnit)).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-xl">Accept</button>
        </div>
      </form>

      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Stock Items List</h3>
        <table className="w-full text-xs text-left border">
          <thead className="bg-gray-50 uppercase font-bold text-gray-500 border-b">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Group</th>
              <th className="p-2 text-right">Opening Balance</th>
              <th className="p-2 text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b hover:bg-gray-100">
                <td className="p-2 font-bold text-tally-teal">{i.name}</td>
                <td className="p-2 uppercase">{stockGroups.find(g => g.id === i.under)?.name || 'Primary'}</td>
                <td className="p-2 text-right">{i.openingBalance} {units.find(u => u.id === i.unitId)?.symbol}</td>
                <td className="p-2 text-right">₹{i.ratePerUnit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
