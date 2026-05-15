/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Ledger {
  id: string;
  name: string;
  group: string;
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
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (initialType) setType(initialType as any);
  }, [initialType]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
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

  const getAccountLedgers = () => {
    return ledgers.filter(l => l.group === 'Cash-in-hand' || l.group === 'Bank Accounts');
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
    const rowType = type === 'Receipt' ? 'Cr' : 'Dr';
    setEntries([...entries, { ledgerId: '', costCentreId: '', amount: '', type: rowType as any, tempSearch: '' }]);
  };

  const calculateTotal = () => {
    return entries.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalEntries = entries.map(e => ({ 
      ledgerId: e.ledgerId || null,
      costCentreId: e.costCentreId || null,
      amount: Number(e.amount),
      type: e.type 
    }));

    // Add the "Account" side of the transaction for Single Entry mode
    if (['Contra', 'Payment', 'Receipt'].includes(type) && selectedAccountId) {
      const accountSideType = type === 'Receipt' ? 'Dr' : 'Cr';
      finalEntries.push({
        ledgerId: selectedAccountId,
        costCentreId: null,
        amount: calculateTotal(),
        type: accountSideType
      });
    }

    const response = await fetch('api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        date, 
        type, 
        narration, 
        amount: calculateTotal(),
        branchId,
        entries: finalEntries
      }),
    });
    if (response.ok) {
      alert('Voucher Saved Successfully');
      setEntries([{ ledgerId: '', costCentreId: '', amount: '', type: (type === 'Receipt' ? 'Cr' : 'Dr'), tempSearch: '' }]);
      setNarration('');
      setSelectedAccountId('');
      setAccountSearch('');
    }
  };

  const selectedAccount = ledgers.find(l => l.id === selectedAccountId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          {['Contra', 'Payment', 'Receipt', 'Journal'].map((t, idx) => (
            <button 
              key={t}
              type="button" 
              onClick={() => handleTypeChange(t as any)}
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

      {/* Account Selection (Single Entry Mode) */}
      {['Contra', 'Payment', 'Receipt'].includes(type) && (
        <div className="bg-tally-accent/5 p-4 border-2 border-tally-teal/10 flex items-center gap-6">
           <div className="w-24 text-[10px] font-black text-tally-teal uppercase italic">Account :</div>
           <div className="relative flex-1 max-w-md">
             <input 
               type="text"
               value={accountSearch || selectedAccount?.name || ''}
               onChange={(e) => {
                 setAccountSearch(e.target.value);
                 setShowAccountDropdown(true);
               }}
               onFocus={() => setShowAccountDropdown(true)}
               onBlur={() => setTimeout(() => setShowAccountDropdown(false), 200)}
               placeholder="Select Cash or Bank Account..."
               className="w-full bg-transparent border-b-2 border-tally-teal/30 focus:border-tally-teal outline-none py-1 font-bold text-sm"
             />
             {showAccountDropdown && (
               <div className="absolute z-[70] left-0 mt-1 w-full bg-white border-2 border-tally-teal shadow-2xl max-h-48 overflow-auto">
                 {getAccountLedgers().filter(l => l.name.toLowerCase().includes(accountSearch.toLowerCase())).map(l => (
                   <div 
                     key={l.id}
                     onMouseDown={() => {
                        setSelectedAccountId(l.id);
                        setAccountSearch('');
                        setShowAccountDropdown(false);
                     }}
                     className="px-3 py-2 text-xs font-bold hover:bg-tally-accent transition-colors flex justify-between uppercase cursor-pointer"
                   >
                     <span>{l.name}</span>
                     <span className="text-[9px] opacity-40 italic">{l.group}</span>
                   </div>
                 ))}
               </div>
             )}
             {selectedAccountId && (
                <div className="absolute top-1 right-0 text-[10px] font-bold text-blue-600">
                  BAL: ₹ {Math.abs(ledgerBalances[selectedAccountId]).toLocaleString()} {ledgerBalances[selectedAccountId] >= 0 ? 'Dr' : 'Cr'}
                </div>
             )}
           </div>
        </div>
      )}

      <div className="border-2 border-tally-teal/20 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-[10px] font-bold uppercase text-gray-500 border-b-2 border-tally-teal/10">
            <tr>
              <th className="px-4 py-2 text-left w-16">
                {['Contra', 'Payment', 'Receipt'].includes(type) ? 'To/By' : 'Dr/Cr'}
              </th>
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
                  {!['Contra', 'Payment', 'Receipt'].includes(type) ? (
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
                  ) : (
                    <div className="px-4 font-bold text-tally-teal italic">
                      {type === 'Receipt' ? 'Cr' : 'Dr'}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1">
                  <div className="relative">
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
                      onBlur={() => {
                        // Small delay to allow onMouseDown on items to fire
                        setTimeout(() => setActiveDropdownIdx(null), 200);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className="w-full focus:outline-none font-bold bg-transparent italic border-b border-transparent focus:border-tally-teal"
                      placeholder="Type ledger name..."
                      required
                    />
                    {/* Custom search results */}
                    {activeDropdownIdx === idx && (
                      <div className="absolute z-[60] left-0 mt-1 w-64 bg-white border-2 border-tally-teal shadow-2xl max-h-48 overflow-auto">
                        {getFilteredLedgers(entry.tempSearch || '').map((l, lIdx) => (
                          <div 
                            key={l.id} 
                            onMouseDown={() => handleSelectLedger(idx, l)}
                            className={`px-2 py-1.5 text-xs font-bold border-b last:border-0 cursor-pointer flex justify-between uppercase transition-colors ${
                              highlightedIdx === lIdx ? 'bg-tally-accent text-black' : 'hover:bg-tally-accent/10'
                            }`}
                          >
                             <span>{l.name}</span>
                             <span className="text-[9px] opacity-40">₹ {Math.abs(ledgerBalances[l.id] || 0)} {ledgerBalances[l.id] >= 0 ? 'Dr' : 'Cr'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {entry.ledgerId && (
                      <div className="text-[9px] font-bold text-gray-400 mt-0.5 flex justify-between">
                         <span className="uppercase tracking-widest">Balance:</span>
                         <span className={ledgerBalances[entry.ledgerId] >= 0 ? 'text-blue-600' : 'text-red-600'}>
                           ₹ {Math.abs(ledgerBalances[entry.ledgerId]).toLocaleString()} {ledgerBalances[entry.ledgerId] >= 0 ? 'Dr' : 'Cr'}
                         </span>
                      </div>
                    )}
                  </div>
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
                  {(entry.type === 'Dr' || (['Contra', 'Payment', 'Receipt'].includes(type))) && (
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
                  {entry.type === 'Cr' && !['Contra', 'Payment', 'Receipt'].includes(type) && (
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
             <span>Total Amount</span>
             <span className="font-mono">₹ {calculateTotal().toLocaleString()}</span>
          </div>
          <button type="submit" className="w-full bg-tally-teal text-white py-2 text-xs font-bold uppercase shadow-lg hover:bg-teal-700 transition-all active:scale-95">Accept (Enter)</button>
        </div>
      </div>
    </form>
  );
}
  );
}
