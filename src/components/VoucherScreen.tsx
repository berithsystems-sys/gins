/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Ledger {
  id: string;
  name: string;
}

interface CostCentre {
  id: string;
  name: string;
}

export default function VoucherScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [type, setType] = useState<'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'>('Payment');
  const [date, setDate] = useState('2026-05-12');
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState([{ ledgerId: '', costCentreId: '', amount: '', type: 'Dr' as 'Dr' | 'Cr' }]);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    fetch(`api/ledgers${query}`).then(res => res.json()).then(setLedgers);
    fetch(`api/cost-centres${query}`).then(res => res.json()).then(setCostCentres);
    
    // Internal Voucher Hotkeys
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F4') setType('Contra');
      if (event.key === 'F5') setType('Payment');
      if (event.key === 'F6') setType('Receipt');
      if (event.key === 'F7') setType('Journal');
      if (event.key === 'F8') setType('Sales');
      if (event.key === 'F9') setType('Purchase');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [branchId]);

  const handleAddEntry = () => {
    setEntries([...entries, { ledgerId: '', costCentreId: '', amount: '', type: 'Dr' }]);
  };

  const calculateTotal = () => {
    return entries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        date, 
        type, 
        narration, 
        amount: calculateTotal(),
        branchId,
        entries: entries.map(e => ({ 
          ledgerId: e.ledgerId || null,
          costCentreId: e.costCentreId || null,
          amount: Number(e.amount),
          type: e.type 
        }))
      }),
    });
    if (response.ok) {
      alert('Voucher Saved Successfully');
      setEntries([{ ledgerId: '', costCentreId: '', amount: '', type: 'Dr' }]);
      setNarration('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          {['Contra', 'Payment', 'Receipt', 'Journal', 'Sales', 'Purchase'].map((t, idx) => (
            <button 
              key={t}
              type="button" 
              onClick={() => setType(t as any)}
              className={`px-3 py-1 text-[10px] font-bold border rounded transition-colors ${type === t ? 'bg-tally-teal text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              F{idx + 4}: {t}
            </button>
          ))}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Date</div>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-bold border-b-2 border-tally-teal focus:outline-none focus:bg-tally-bg p-1"
          />
        </div>
      </div>

      <div className="border-2 border-tally-teal/20 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-[10px] font-bold uppercase text-gray-500 border-b-2 border-tally-teal/10">
            <tr>
              <th className="px-4 py-2 text-left w-16">Dr/Cr</th>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-left w-40">Cost Centre</th>
              <th className="px-4 py-2 text-right w-32">Debit (₹)</th>
              <th className="px-4 py-2 text-right w-32">Credit (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-tally-accent/5">
                <td className="px-1 py-1">
                  <select 
                    value={entry.type}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[idx].type = e.target.value as 'Dr' | 'Cr';
                      setEntries(newEntries);
                    }}
                    className="w-full focus:outline-none font-bold text-tally-teal bg-transparent px-2"
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={entry.ledgerId}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[idx].ledgerId = e.target.value;
                      setEntries(newEntries);
                    }}
                    className="w-full focus:outline-none font-bold bg-transparent italic"
                    required
                  >
                    <option value="">Select Ledger...</option>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={entry.costCentreId}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[idx].costCentreId = e.target.value;
                      setEntries(newEntries);
                    }}
                    className="w-full focus:outline-none text-[11px] bg-transparent opacity-70"
                  >
                    <option value="">(None)</option>
                    {costCentres.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-1">
                  {entry.type === 'Dr' && (
                    <input 
                      type="number" 
                      value={entry.amount}
                      onChange={(e) => {
                        const newEntries = [...entries];
                        newEntries[idx].amount = e.target.value;
                        setEntries(newEntries);
                      }}
                      className="w-full text-right focus:outline-none bg-transparent font-mono font-bold"
                      placeholder="0.00"
                    />
                  )}
                </td>
                <td className="px-4 py-1">
                  {entry.type === 'Cr' && (
                    <input 
                      type="number" 
                      value={entry.amount}
                      onChange={(e) => {
                        const newEntries = [...entries];
                        newEntries[idx].amount = e.target.value;
                        setEntries(newEntries);
                      }}
                      className="w-full text-right focus:outline-none bg-transparent font-mono font-bold"
                      placeholder="0.00"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-tally-teal/10 invisible">
             <tr><td colSpan={5}>Space for total</td></tr>
          </tfoot>
        </table>
        <button 
          type="button" 
          onClick={handleAddEntry}
          className="w-full py-2 text-[10px] text-tally-teal font-extrabold uppercase hover:bg-tally-accent/20 border-t border-tally-teal/10 transition-colors"
        >
          + Add Particulars (Alt+C to new ledger)
        </button>
      </div>

      <div className="flex gap-6 mt-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Narration</label>
          <textarea 
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={2}
            placeholder="Enter narration for this transaction..."
            className="w-full border border-tally-teal/20 p-2 text-xs focus:outline-none focus:border-tally-teal bg-gray-50 italic"
          />
        </div>
        <div className="w-1/3 flex flex-col justify-end gap-2 border-l border-gray-100 pl-6">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
             <span>Sub Total</span>
             <span className="font-mono">{calculateTotal().toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-black text-tally-teal">
             <span>Total Dr/Cr</span>
             <span className="font-mono">₹ {calculateTotal().toLocaleString()}</span>
          </div>
          <button type="submit" className="w-full bg-tally-teal text-white py-2 text-xs font-bold uppercase shadow-lg hover:bg-teal-700 transition-all active:scale-95">Accept (Enter)</button>
        </div>
      </div>
    </form>
  );
}
