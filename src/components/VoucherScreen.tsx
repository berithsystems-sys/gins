/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Ledger {
  id: string;
  name: string;
}

interface StockItem {
  id: string;
  name: string;
  ratePerUnit: number;
}

export default function VoucherScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [type, setType] = useState<'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'>('Payment');
  const [date, setDate] = useState('2026-05-12');
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState([{ ledgerId: '', stockItemId: '', quantity: '', rate: '', amount: '', type: 'Dr' as 'Dr' | 'Cr' }]);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    fetch(`api/ledgers${query}`).then(res => res.json()).then(setLedgers);
    fetch(`api/stock-items${query}`).then(res => res.json()).then(setStockItems);
    
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
    setEntries([...entries, { ledgerId: '', stockItemId: '', quantity: '', rate: '', amount: '', type: 'Dr' }]);
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
          stockItemId: e.stockItemId || null,
          quantity: e.quantity ? Number(e.quantity) : null,
          rate: e.rate ? Number(e.rate) : null,
          amount: Number(e.amount),
          type: e.type 
        }))
      }),
    });
    if (response.ok) {
      alert('Voucher Saved');
      setEntries([{ ledgerId: '', amount: '', type: 'Dr' }]);
      setNarration('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4">
          <button 
            type="button" 
            onClick={() => setType('Payment')}
            className={`px-3 py-1 text-[10px] font-bold border rounded ${type === 'Payment' ? 'bg-tally-teal text-white' : 'bg-gray-100'}`}
          >
            F5: Payment
          </button>
          <button 
            type="button" 
            onClick={() => setType('Receipt')}
            className={`px-3 py-1 text-[10px] font-bold border rounded ${type === 'Receipt' ? 'bg-tally-teal text-white' : 'bg-gray-100'}`}
          >
            F6: Receipt
          </button>
          <button 
            type="button" 
            onClick={() => setType('Journal')}
            className={`px-3 py-1 text-[10px] font-bold border rounded ${type === 'Journal' ? 'bg-tally-teal text-white' : 'bg-gray-100'}`}
          >
            F7: Journal
          </button>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-500">Date</div>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-bold border-b border-tally-teal focus:outline-none"
          />
        </div>
      </div>

      <div className="border border-tally-teal/30">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-[10px] font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left w-16">Dr/Cr</th>
              <th className="px-4 py-2 text-left">Particulars (Ledger)</th>
              <th className="px-4 py-2 text-left">Item (Optional)</th>
              <th className="px-4 py-2 text-right w-24">Qty/Rate</th>
              <th className="px-4 py-2 text-right w-32">Debit</th>
              <th className="px-4 py-2 text-right w-32">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-tally-active/5">
                <td className="px-1 py-1">
                  <select 
                    value={entry.type}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[idx].type = e.target.value as 'Dr' | 'Cr';
                      setEntries(newEntries);
                    }}
                    className="w-full focus:outline-none font-bold text-tally-teal bg-transparent px-1"
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
                    className="w-full focus:outline-none font-medium bg-transparent"
                    required
                  >
                    <option value="">Select Ledger...</option>
                    {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={entry.stockItemId}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      const itemId = e.target.value;
                      newEntries[idx].stockItemId = itemId;
                      if (itemId) {
                        const item = stockItems.find(si => si.id === itemId);
                        if (item) newEntries[idx].rate = item.ratePerUnit.toString();
                      }
                      setEntries(newEntries);
                    }}
                    className="w-full focus:outline-none text-[12px] bg-transparent"
                  >
                    <option value="">(None)</option>
                    {stockItems.map(si => <option key={si.id} value={si.id}>{si.name}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  {entry.stockItemId && (
                    <div className="flex flex-col gap-1">
                      <input 
                        type="number" 
                        placeholder="Qty"
                        value={entry.quantity}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          const qty = e.target.value;
                          newEntries[idx].quantity = qty;
                          newEntries[idx].amount = (Number(qty || 0) * Number(newEntries[idx].rate || 0)).toString();
                          setEntries(newEntries);
                        }}
                        className="w-full text-right focus:outline-none bg-blue-50/50 text-[11px] border border-transparent focus:border-tally-teal px-1"
                      />
                      <input 
                        type="number" 
                        placeholder="Rate"
                        value={entry.rate}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          const rate = e.target.value;
                          newEntries[idx].rate = rate;
                          newEntries[idx].amount = (Number(newEntries[idx].quantity || 0) * Number(rate || 0)).toString();
                          setEntries(newEntries);
                        }}
                        className="w-full text-right focus:outline-none bg-blue-50/50 text-[11px] border border-transparent focus:border-tally-teal px-1"
                      />
                    </div>
                  )}
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
                      className="w-full text-right focus:outline-none bg-transparent font-bold"
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
                      className="w-full text-right focus:outline-none bg-transparent font-bold"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button 
          type="button" 
          onClick={handleAddEntry}
          className="w-full py-2 text-[10px] text-tally-teal font-bold hover:bg-tally-bg border-t border-tally-teal/10"
        >
          + Add Line
        </button>
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-gray-400 uppercase">Narration</label>
        <textarea 
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          rows={2}
          className="w-full border border-tally-teal/20 p-2 text-sm focus:outline-none focus:border-tally-teal bg-gray-50"
        />
      </div>

      <div className="flex justify-end gap-4">
        <button type="submit" className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase shadow-md">Accept</button>
      </div>
    </form>
  );
}
