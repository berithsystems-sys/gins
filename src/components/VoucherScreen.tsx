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

export default function VoucherScreen({ branchId, onTypeChange, initialType, initialDate }: { branchId?: string; onTypeChange?: (type: string) => void; initialType?: string; initialDate?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [type, setType] = useState<'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'>((initialType as any) || 'Payment');
  const [date, setDate] = useState(initialDate || '2026-05-12');
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState([{ ledgerId: '', costCentreId: '', amount: '', type: 'Dr' as 'Dr' | 'Cr', tempSearch: '' }]);
  const [ledgerBalances, setLedgerBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (initialType) setType(initialType as any);
  }, [initialType]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    fetch(`api/ledgers${query}`).then(res => res.json()).then(data => {
      setLedgers(data);
      const balances: Record<string, number> = {};
      data.forEach((l: any) => {
        balances[l.id] = l.openingBalance * (l.balanceType === 'Cr' ? -1 : 1);
      });
      setLedgerBalances(balances);
    });
    fetch(`api/cost-centres${query}`).then(res => res.json()).then(setCostCentres);
  }, [branchId]);

  const handleSelectLedger = (idx: number, ledger: Ledger) => {
    const newEntries = [...entries];
    newEntries[idx].ledgerId = ledger.id;
    newEntries[idx].tempSearch = ledger.name;
    setEntries(newEntries);
    setActiveDropdownIdx(null);
  };

  const getFilteredLedgers = (searchTerm: string) => {
    const search = searchTerm?.toLowerCase() || '';
    return ledgers.filter(l => l.name.toLowerCase().includes(search));
  };

  const handleKeyDown = (e: React.KeyboardEvent, entryIdx: number) => {
    const filtered = getFilteredLedgers(entries[entryIdx].tempSearch || '');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.min(filtered.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered.length > 0 && activeDropdownIdx !== null) {
        // Only prevent default if we have results to pick from
        const selected = filtered[highlightedIdx];
        if (selected) {
          e.preventDefault();
          handleSelectLedger(entryIdx, selected);
        }
      }
    } else if (e.key === 'Escape') {
      setActiveDropdownIdx(null);
    }
  };

  const handleTypeChange = (t: typeof type) => {
    setType(t);
    if (onTypeChange) onTypeChange(t);
  };

  const handleAddEntry = () => {
    setEntries([...entries, { ledgerId: '', costCentreId: '', amount: '', type: 'Dr', tempSearch: '' }]);
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
      setEntries([{ ledgerId: '', costCentreId: '', amount: '', type: 'Dr', tempSearch: '' }]);
      setNarration('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-tally-bg">
      {/* Header Info */}
      <div className="flex justify-between items-start bg-tally-light p-2 tally-border tally-shadow mb-4">
        <div className="flex flex-col">
          <span className="text-red-700 font-bold text-sm uppercase">{type} Voucher</span>
          <span className="text-[10px] font-bold text-gray-500 uppercase">No. {entries.length}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Date</span>
          <input 
            type="text" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-bold bg-transparent border-b border-tally-teal focus:outline-none text-right"
          />
        </div>
      </div>

      {/* Main Entry Table */}
      <div className="flex-grow bg-white tally-border tally-shadow overflow-hidden flex flex-col">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-xs">
            <thead className="bg-tally-sidebar text-white sticky top-0">
              <tr>
                <th className="px-4 py-1 text-left w-16">Dr/Cr</th>
                <th className="px-4 py-1 text-left">Particulars</th>
                <th className="px-4 py-1 text-right w-40">Debit (₹)</th>
                <th className="px-4 py-1 text-right w-40">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-tally-accent">
                  <td className="px-4 py-0.5 font-bold text-tally-teal">
                    <select 
                      value={entry.type}
                      onChange={(e) => {
                        const newEntries = [...entries];
                        newEntries[idx].type = e.target.value as 'Dr' | 'Cr';
                        setEntries(newEntries);
                      }}
                      className="w-full bg-transparent focus:outline-none"
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </td>
                  <td className="px-4 py-0.5 relative">
                    <input 
                      type="text"
                      value={entry.tempSearch || ledgers.find(l => l.id === entry.ledgerId)?.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = ledgers.find(l => l.name.toLowerCase() === val.toLowerCase());
                        const newEntries = [...entries];
                        newEntries[idx].tempSearch = val;
                        newEntries[idx].ledgerId = match ? match.id : '';
                        setEntries(newEntries);
                        setHighlightedIdx(0);
                      }}
                      onFocus={() => {
                        setActiveDropdownIdx(idx);
                        setHighlightedIdx(0);
                      }}
                      onBlur={() => setTimeout(() => setActiveDropdownIdx(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className="w-full bg-transparent focus:outline-none font-bold"
                      placeholder="Select Ledger..."
                    />
                    {activeDropdownIdx === idx && (
                      <div className="absolute z-[60] left-0 mt-1 w-full bg-white tally-border tally-shadow max-h-48 overflow-auto">
                        {getFilteredLedgers(entry.tempSearch || '').map((l, lIdx) => (
                          <div 
                            key={l.id} 
                            onMouseDown={() => handleSelectLedger(idx, l)}
                            className={`px-4 py-1 text-xs font-bold border-b last:border-0 cursor-pointer flex justify-between uppercase ${highlightedIdx === lIdx ? 'bg-tally-accent' : ''}`}
                          >
                             <span>{l.name}</span>
                             <span className="text-[10px] opacity-60">₹ {Math.abs(ledgerBalances[l.id] || 0)} {ledgerBalances[l.id] >= 0 ? 'Dr' : 'Cr'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-0.5">
                    {entry.type === 'Dr' && (
                      <input 
                        type="number" 
                        value={entry.amount}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          newEntries[idx].amount = e.target.value;
                          setEntries(newEntries);
                        }}
                        className="w-full text-right bg-transparent focus:outline-none font-bold"
                      />
                    )}
                  </td>
                  <td className="px-4 py-0.5">
                    {entry.type === 'Cr' && (
                      <input 
                        type="number" 
                        value={entry.amount}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          newEntries[idx].amount = e.target.value;
                          setEntries(newEntries);
                        }}
                        className="w-full text-right bg-transparent focus:outline-none font-bold"
                      />
                    )}
                  </td>
                </tr>
              ))}
              {/* New Entry Trigger Row */}
              <tr onClick={handleAddEntry} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-1 italic text-gray-400" colSpan={4}>Click or Alt+A to add more entries...</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Bar */}
        <div className="bg-tally-sidebar text-white flex justify-between px-4 py-1 font-bold text-xs uppercase">
          <span>Total</span>
          <div className="flex gap-20">
            <span className="w-40 text-right">₹ {calculateTotal().toLocaleString()}</span>
            <span className="w-40 text-right">₹ {calculateTotal().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer Area: Narration & Buttons */}
      <div className="mt-4 flex gap-4">
        <div className="flex-grow">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Narration:</label>
          <textarea 
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="w-full tally-border tally-shadow p-2 text-xs focus:outline-none h-12 italic bg-white"
          />
        </div>
        <div className="flex flex-col gap-2 w-48 justify-end">
          <button type="submit" className="w-full bg-tally-teal text-white py-2 font-bold uppercase text-xs tally-shadow hover:bg-tally-header transition-colors">Accept (Enter)</button>
          <button type="button" onClick={() => window.history.back()} className="w-full bg-gray-200 py-2 font-bold uppercase text-xs tally-shadow hover:bg-gray-300">No (Esc)</button>
        </div>
      </div>

      {/* Tally Vertical Button Bar Placeholder */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {['F2:Date', 'F3:Company', 'F4:Contra', 'F5:Payment', 'F6:Receipt', 'F7:Journal', 'F8:Sales', 'F9:Purchase', 'F10:Other', 'F11:Features', 'F12:Config'].map((btn) => (
          <div key={btn} className="flex-grow bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black border-l-2 border-transparent hover:border-black">
            {btn}
          </div>
        ))}
      </div>
    </form>
  );
}
