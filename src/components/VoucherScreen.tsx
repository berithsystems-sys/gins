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
  const [entries, setEntries] = useState([{ ledgerId: '', costCentreId: '', amount: '', type: (initialType === 'Receipt' ? 'Cr' : 'Dr') as 'Dr' | 'Cr', tempSearch: '', methodAdjustment: 'On Account', refNo: '' }]);

  useEffect(() => {
    if (initialType) {
      setType(initialType as any);
      // Auto-arrange first Dr/Cr based on type
      const newEntries = [...entries];
      if (initialType === 'Receipt') newEntries[0].type = 'Cr';
      else if (initialType === 'Payment') newEntries[0].type = 'Dr';
      else if (initialType === 'Contra') newEntries[0].type = 'Dr';
      setEntries(newEntries);
    }
  }, [initialType]);

  const handleSelectLedger = (idx: number, ledger: Ledger) => {
    const newEntries = [...entries];
    newEntries[idx].ledgerId = ledger.id;
    newEntries[idx].tempSearch = ledger.name;
    
    // Set default Dr/Cr for subsequent entries based on balance
    if (idx > 0) {
      const drTotal = newEntries.slice(0, idx).filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const crTotal = newEntries.slice(0, idx).filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const diff = drTotal - crTotal;
      if (diff > 0) newEntries[idx].type = 'Cr';
      else if (diff < 0) newEntries[idx].type = 'Dr';
    }
    
    setEntries(newEntries);
    setActiveDropdownIdx(null);
  };

  const handleAddEntry = () => {
    const drTotal = entries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const crTotal = entries.filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const diff = Math.abs(drTotal - crTotal);
    const nextType = drTotal > crTotal ? 'Cr' : 'Dr';
    
    setEntries([...entries, { 
      ledgerId: '', 
      costCentreId: '', 
      amount: diff > 0 ? diff.toString() : '', 
      type: nextType, 
      tempSearch: '',
      methodAdjustment: 'On Account',
      refNo: ''
    }]);
  };

  const handleRemoveEntry = (idx: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== idx));
    }
  };

  const [ledgerBalances, setLedgerBalances] = useState<Record<string, number>>({});
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

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

  const calculateTotal = (drCr?: 'Dr' | 'Cr') => {
    if (!drCr) {
      return entries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    }
    return entries.filter(e => e.type === drCr).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  };

  const handleClear = () => {
    if (confirm('Clear all entries?')) {
      setEntries([{ ledgerId: '', costCentreId: '', amount: '', type: (type === 'Receipt' ? 'Cr' : 'Dr'), tempSearch: '', methodAdjustment: 'On Account', refNo: '' }]);
      setNarration('');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validation
    const drTotal = entries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const crTotal = entries.filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    
    if (drTotal === 0 && crTotal === 0) return; // Prevent empty save

    if (drTotal !== crTotal) {
      alert(`Debit (₹${drTotal}) and Credit (₹${crTotal}) totals must match! Difference: ₹${Math.abs(drTotal - crTotal)}`);
      return;
    }

    if (entries.some(e => !e.ledgerId || !e.amount)) {
      alert('Please ensure all entries have a selected ledger and an amount.');
      return;
    }

    try {
      const response = await fetch('api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          type, 
          narration, 
          amount: drTotal,
          branchId,
          entries: entries.map(e => ({ 
            ledgerId: e.ledgerId,
            costCentreId: e.costCentreId || null,
            amount: Number(e.amount),
            type: e.type,
            methodAdjustment: e.methodAdjustment,
            refNo: e.refNo
          }))
        }),
      });

      if (response.ok) {
        alert('Voucher Saved Successfully');
        setEntries([{ ledgerId: '', costCentreId: '', amount: '', type: (type === 'Receipt' ? 'Cr' : 'Dr'), tempSearch: '', methodAdjustment: 'On Account', refNo: '' }]);
        setNarration('');
      } else {
        const errorData = await response.json();
        alert(`Failed to save voucher: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    }
  };

  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
    if (e.altKey && e.key === 'a') {
      handleAddEntry();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [entries, date, narration, type]);

  return (
    <div className="flex flex-col h-full bg-tally-bg">
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
      <div className="flex-grow bg-white tally-border tally-shadow overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-xs">
            <thead className="bg-tally-sidebar text-white sticky top-0 z-20">
              <tr>
                <th className="px-4 py-1 text-left w-16">To/By</th>
                <th className="px-4 py-1 text-left">Particulars</th>
                <th className="px-4 py-1 text-right w-40">Debit (₹)</th>
                <th className="px-4 py-1 text-right w-40">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-b border-gray-100 hover:bg-tally-accent">
                    <td className="px-4 py-0.5 font-bold text-tally-teal">
                      <select 
                        value={entry.type}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          newEntries[idx].type = e.target.value as 'Dr' | 'Cr';
                          setEntries(newEntries);
                        }}
                        className="w-full bg-transparent focus:outline-none cursor-pointer"
                      >
                        <option value="Dr">By (Dr)</option>
                        <option value="Cr">To (Cr)</option>
                      </select>
                    </td>
                    <td className="px-4 py-0.5 relative">
                      <div className="flex items-center gap-2">
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
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          className="w-full bg-transparent focus:outline-none font-bold uppercase"
                          placeholder="Particulars..."
                        />
                        {entries.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveEntry(idx)}
                            className="text-gray-300 hover:text-red-500 text-[10px]"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      {activeDropdownIdx === idx && (
                        <div className="absolute z-[100] left-0 mt-1 w-[400px] bg-white border-2 border-tally-teal shadow-2xl max-h-80 overflow-y-auto">
                          <div className="bg-tally-teal text-white text-[10px] px-2 py-0.5 font-bold flex justify-between sticky top-0 z-10">
                            <span>List of Ledger Accounts</span>
                            <span>Balance</span>
                          </div>
                          {getFilteredLedgers(entry.tempSearch || '').map((l, lIdx) => (
                            <div 
                              key={l.id} 
                              onMouseDown={() => handleSelectLedger(idx, l)}
                              className={`px-2 py-1 text-xs font-bold border-b border-gray-50 cursor-pointer flex justify-between uppercase ${highlightedIdx === lIdx ? 'bg-tally-accent text-black' : 'hover:bg-gray-100'}`}
                            >
                               <span>{l.name}</span>
                               <span className="text-[10px] opacity-60 font-mono">
                                 {Math.abs(ledgerBalances[l.id] || 0).toLocaleString()} {ledgerBalances[l.id] >= 0 ? 'Dr' : 'Cr'}
                               </span>
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
                          className="w-full text-right bg-transparent focus:outline-none font-bold font-mono"
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
                          className="w-full text-right bg-transparent focus:outline-none font-bold font-mono"
                        />
                      )}
                    </td>
                  </tr>
                  {/* Bill-wise Details Row */}
                  {entry.ledgerId && (
                    <tr className="bg-blue-50/30 text-[10px]">
                      <td></td>
                      <td className="px-4 py-1 flex gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-bold uppercase">Method:</span>
                          <select 
                            value={entry.methodAdjustment}
                            onChange={(e) => {
                              const newEntries = [...entries];
                              newEntries[idx].methodAdjustment = e.target.value;
                              setEntries(newEntries);
                            }}
                            className="bg-transparent font-bold text-tally-teal outline-none"
                          >
                            <option>Advance</option>
                            <option>Against Ref</option>
                            <option>New Ref</option>
                            <option>On Account</option>
                          </select>
                        </div>
                        {(entry.methodAdjustment === 'New Ref' || entry.methodAdjustment === 'Against Ref') && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-bold uppercase">Ref No:</span>
                            <input 
                              type="text" 
                              value={entry.refNo}
                              onChange={(e) => {
                                const newEntries = [...entries];
                                newEntries[idx].refNo = e.target.value;
                                setEntries(newEntries);
                              }}
                              className="bg-transparent border-b border-tally-teal/30 focus:border-tally-teal outline-none font-bold uppercase px-1"
                              placeholder="e.g. INV-001"
                            />
                          </div>
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Bar */}
        <div className="bg-tally-sidebar text-white flex justify-between px-4 py-1 font-bold text-xs uppercase z-10">
          <span>Total</span>
          <div className="flex gap-20">
            <span className="w-40 text-right font-mono">₹ {calculateTotal('Dr').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="w-40 text-right font-mono">₹ {calculateTotal('Cr').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
            placeholder="Enter narration..."
          />
        </div>
        <div className="flex flex-col gap-2 w-48 justify-end pb-1">
          <div className="flex gap-1">
            <button 
              type="button" 
              onClick={handleClear}
              className="flex-1 bg-gray-100 py-1 font-bold uppercase text-[9px] border hover:bg-gray-200"
            >
              Clear (Alt+R)
            </button>
            <button 
              type="button" 
              onClick={handleAddEntry}
              className="flex-1 bg-tally-teal text-white py-1 font-bold uppercase text-[9px] hover:bg-tally-header"
            >
              Add Line (Alt+A)
            </button>
          </div>
          <button 
            type="button" 
            onClick={() => handleSubmit()}
            className="w-full bg-tally-teal text-white py-2 font-bold uppercase text-xs tally-shadow hover:bg-tally-header"
          >
            Accept (Ctrl+Enter)
          </button>
        </div>
      </div>

      {/* Tally Vertical Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white z-50">
        {[
          { label: 'F2:Date', key: 'F2' },
          { label: 'F4:Contra', action: () => handleTypeChange('Contra') },
          { label: 'F5:Payment', action: () => handleTypeChange('Payment') },
          { label: 'F6:Receipt', action: () => handleTypeChange('Receipt') },
          { label: 'F7:Journal', action: () => handleTypeChange('Journal') },
          { label: 'F8:Sales', action: () => handleTypeChange('Sales') },
          { label: 'F9:Purchase', action: () => handleTypeChange('Purchase') },
          { label: 'F12:Config' }
        ].map((btn) => (
          <div 
            key={btn.label} 
            onClick={btn.action}
            className="flex-grow bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black border-l-2 border-transparent hover:border-black transition-all"
          >
            {btn.label}
          </div>
        ))}
      </div>
    </div>
  );
};
