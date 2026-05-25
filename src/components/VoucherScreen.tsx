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

export default function VoucherScreen({ branchId, onTypeChange, initialType, initialDate, user }: { branchId?: string; onTypeChange?: (type: string) => void; initialType?: string; initialDate?: string; user?: any }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
  const [type, setType] = useState<'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'>((initialType as any) || 'Payment');
  const [date, setDate] = useState(initialDate || '2026-05-12');
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState([{ ledgerId: '', costCentreId: '', amount: '', type: (initialType === 'Receipt' ? 'Cr' : 'Dr') as 'Dr' | 'Cr', tempSearch: '', methodAdjustment: 'On Account', refNo: '' }]);
  const [accountLedgerId, setAccountLedgerId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

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

  const handleSelectAccount = (ledger: Ledger) => {
    setAccountLedgerId(ledger.id);
    setAccountSearch(ledger.name);
    setShowAccountDropdown(false);
    // Focus first particulars field
    setTimeout(() => document.getElementById('ledger-0')?.focus(), 10);
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
  const [focusedField, setFocusedField] = useState<{ idx: number, field: 'ledger' | 'amount' } | null>(null);

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
    
    // Move focus to amount field after selecting ledger
    setTimeout(() => {
      const amountInput = document.getElementById(`amount-${idx}`);
      amountInput?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent, entryIdx: number, field: 'ledger' | 'amount' | 'account') => {
    const searchTerm = field === 'account' ? accountSearch : entries[entryIdx].tempSearch;
    const filtered = getFilteredLedgers(searchTerm || '');
    
    if (e.key === 'ArrowDown') {
      if ((field === 'ledger' && activeDropdownIdx !== null) || (field === 'account' && showAccountDropdown)) {
        e.preventDefault();
        setHighlightedIdx(prev => Math.min(filtered.length - 1, prev + 1));
      }
    } else if (e.key === 'ArrowUp') {
      if ((field === 'ledger' && activeDropdownIdx !== null) || (field === 'account' && showAccountDropdown)) {
        e.preventDefault();
        setHighlightedIdx(prev => Math.max(0, prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'account') {
        if (showAccountDropdown && filtered.length > 0) {
          handleSelectAccount(filtered[highlightedIdx]);
        } else if (accountLedgerId) {
          document.getElementById('ledger-0')?.focus();
        }
      } else if (field === 'ledger') {
        if (activeDropdownIdx !== null && filtered.length > 0) {
          const selected = filtered[highlightedIdx];
          if (selected) handleSelectLedger(entryIdx, selected);
        } else if (entries[entryIdx].ledgerId) {
          document.getElementById(`amount-${entryIdx}`)?.focus();
        } else if (!entries[entryIdx].tempSearch && entryIdx === entries.length - 1) {
          handleSubmit();
        }
      } else if (field === 'amount') {
        if (entryIdx === entries.length - 1) {
          handleAddEntry();
          setTimeout(() => {
            document.getElementById(`ledger-${entryIdx + 1}`)?.focus();
          }, 50);
        } else {
          document.getElementById(`ledger-${entryIdx + 1}`)?.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setActiveDropdownIdx(null);
      setShowAccountDropdown(false);
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

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    useDrCr: false, // false = To/By, true = Dr/Cr
    singleEntry: false,
    showBillWise: false,
  });

  const getDrLabel = () => config.useDrCr ? 'Dr' : 'By';
  const getCrLabel = () => config.useDrCr ? 'Cr' : 'To';

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log('--- handleSubmit triggered ---');
    if (e) e.preventDefault();
    
    // Validation
    const validEntries = entries.filter(e => e.ledgerId && e.amount);
    console.log('Number of valid entries in table:', validEntries.length);

    let drTotal = entries.filter(e => e.type === 'Dr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    let crTotal = entries.filter(e => e.type === 'Cr').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    
    console.log('Totals - Dr:', drTotal, 'Cr:', crTotal);

    if (drTotal === 0 && crTotal === 0) {
      alert('Validation Error: Voucher is empty. Please enter at least one amount.');
      return;
    }

    // Account field validation for Single Entry
    if (config.singleEntry && !accountLedgerId && type !== 'Journal') {
      alert('Validation Error: Please select an Account (Cash/Bank) for Single Entry mode.');
      return;
    }

    let finalSubmitEntries: any[] = [];

    if (config.singleEntry && type !== 'Journal') {
      // In single entry mode, the 'Account' is one side and 'Particulars' are the other
      const side = (type === 'Receipt' ? 'Dr' : 'Cr');
      const otherSide = (type === 'Receipt' ? 'Cr' : 'Dr');
      
      finalSubmitEntries = entries.filter(e => e.ledgerId && e.amount).map(e => ({
        ledgerId: e.ledgerId,
        costCentreId: e.costCentreId || null,
        amount: Number(e.amount),
        type: otherSide, // Particulars are opposite of the Account
        methodAdjustment: e.methodAdjustment,
        refNo: e.refNo
      }));

      const totalAmt = finalSubmitEntries.reduce((acc, curr) => acc + curr.amount, 0);

      // Add the balancing account entry
      finalSubmitEntries.push({
        ledgerId: accountLedgerId,
        costCentreId: null,
        amount: totalAmt,
        type: side,
        methodAdjustment: 'On Account',
        refNo: ''
      });

      drTotal = totalAmt;
      crTotal = totalAmt;
    } else {
      // DOUBLE-ENTRY VALIDATION
      if (Math.abs(drTotal - crTotal) > 0.01) {
        alert(`Validation Error: Debit (₹${drTotal}) and Credit (₹${crTotal}) do not match! Please balance the voucher.`);
        return;
      }

      finalSubmitEntries = entries.filter(e => e.ledgerId && e.amount).map(e => ({
        ledgerId: e.ledgerId,
        costCentreId: e.costCentreId || null,
        amount: Number(e.amount),
        type: e.type,
        methodAdjustment: e.methodAdjustment,
        refNo: e.refNo
      }));
    }

    console.log('Final entries to submit:', finalSubmitEntries);

    if (finalSubmitEntries.length === 0) {
      alert('Validation Error: No valid entries to save.');
      return;
    }

    // Secondary validation: ensure at least one Dr and one Cr
    const hasDr = finalSubmitEntries.some(e => e.type === 'Dr');
    const hasCr = finalSubmitEntries.some(e => e.type === 'Cr');
    if (!hasDr || !hasCr) {
      alert('Validation Error: Voucher must have at least one Debit and one Credit entry.');
      return;
    }

    try {
      const payload = { 
        date, 
        type, 
        number: `VCH-${Date.now().toString().slice(-6)}`,
        narration, 
        amount: drTotal,
        branchId: branchId || 'HQ', 
        userId: user?.id,
        username: user?.username,
        entries: finalSubmitEntries
      };

      console.log('POSTing Payload:', payload);

      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log('Server Response:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (pErr) {
        throw new Error(`Server returned non-JSON response. Please check server logs.`);
      }

      if (response.ok) {
        alert('SUCCESS: Voucher Saved Successfully!');
        setEntries([{ 
          ledgerId: '', 
          costCentreId: '', 
          amount: '', 
          type: (type === 'Receipt' ? 'Cr' : 'Dr'), 
          tempSearch: '', 
          methodAdjustment: 'On Account', 
          refNo: '' 
        }]);
        setAccountLedgerId('');
        setAccountSearch('');
        setNarration('');
      } else {
        const errorMsg = result.error || 'Unknown error';
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : '';
        alert(`SERVER ERROR: ${errorMsg}${errorDetails}`);
      }
    } catch (err: any) {
      console.error('SUBMIT ERROR:', err);
      alert(`CRITICAL ERROR: ${err.message}`);
    }
  };

  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'F12') {
      e.preventDefault();
      setShowConfig(true);
    }
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
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
      <div className="flex justify-between items-start bg-tally-light p-2 tally-border tally-shadow mb-2">
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

      {/* Account Field (Single Entry Mode) */}
      {config.singleEntry && type !== 'Journal' && (
        <div className="px-4 py-2 bg-white tally-border tally-shadow mb-2">
          <div className="flex items-center gap-4">
            <label className="text-xs font-bold uppercase w-20">Account</label>
            <div className="relative flex-grow max-w-md">
              <div className="flex flex-col">
                <input 
                  id="account-field"
                  type="text"
                  value={accountSearch || ledgers.find(l => l.id === accountLedgerId)?.name || ''}
                  onChange={(e) => {
                    setAccountSearch(e.target.value);
                    setAccountLedgerId('');
                    setShowAccountDropdown(true);
                  }}
                  onFocus={() => setShowAccountDropdown(true)}
                  onKeyDown={(e) => handleKeyDown(e, 0, 'account')}
                  className="w-full border-b border-tally-teal focus:outline-none font-bold uppercase text-sm"
                  placeholder="Select Cash/Bank Account..."
                />
                {accountLedgerId && (
                  <div className="text-[10px] italic text-gray-500">
                    Current balance: {Math.abs(ledgerBalances[accountLedgerId] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerBalances[accountLedgerId] >= 0 ? 'Dr' : 'Cr'}
                  </div>
                )}
              </div>
              {showAccountDropdown && (
                <div className="absolute z-[110] left-0 mt-1 w-full bg-white border-2 border-tally-teal shadow-2xl max-h-60 overflow-y-auto">
                  <div className="bg-tally-teal text-white text-[10px] px-2 py-0.5 font-bold flex justify-between">
                    <span>List of Cash/Bank Accounts</span>
                    <span>Balance</span>
                  </div>
                  {getFilteredLedgers(accountSearch).filter(l => l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank')).map((l, lIdx) => (
                    <div 
                      key={l.id} 
                      onMouseDown={() => handleSelectAccount(l)}
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
            </div>
          </div>
        </div>
      )}

      {/* Main Entry Table */}
      <div className="flex-grow bg-white tally-border tally-shadow overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-grow">
          <table className="w-full text-xs">
            <thead className="bg-tally-sidebar text-white sticky top-0 z-20">
              <tr>
                <th className="px-4 py-1 text-left w-20">{config.useDrCr ? 'Dr/Cr' : 'To/By'}</th>
                <th className="px-4 py-1 text-left">Particulars</th>
                {type === 'Journal' || !config.singleEntry ? (
                  <>
                    <th className="px-4 py-1 text-right w-40">Debit (₹)</th>
                    <th className="px-4 py-1 text-right w-40">Credit (₹)</th>
                  </>
                ) : (
                  <th className="px-4 py-1 text-right w-40">Amount (₹)</th>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-b border-gray-100 hover:bg-tally-accent group">
                    <td className="px-4 py-0.5 font-bold text-tally-teal">
                      <select 
                        value={entry.type}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          newEntries[idx].type = e.target.value as 'Dr' | 'Cr';
                          setEntries(newEntries);
                        }}
                        className="w-full bg-transparent focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="Dr">{getDrLabel()}</option>
                        <option value="Cr">{getCrLabel()}</option>
                      </select>
                    </td>
                    <td className="px-4 py-0.5 relative">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <input 
                            id={`ledger-${idx}`}
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
                            onKeyDown={(e) => handleKeyDown(e, idx, 'ledger')}
                            className="w-full bg-transparent focus:outline-none font-bold uppercase"
                            placeholder="Select Ledger..."
                          />
                          {entries.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveEntry(idx)}
                              className="text-gray-300 hover:text-red-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {entry.ledgerId && (
                          <div className="text-[10px] italic text-gray-500 ml-4">
                            Cur Bal: {Math.abs(ledgerBalances[entry.ledgerId] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerBalances[entry.ledgerId] >= 0 ? 'Dr' : 'Cr'}
                          </div>
                        )}
                      </div>
                      
                      {activeDropdownIdx === idx && (
                        <div className="absolute z-[100] left-0 mt-1 w-[450px] bg-white border-2 border-tally-teal shadow-2xl max-h-80 overflow-y-auto">
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

                    {type === 'Journal' || !config.singleEntry ? (
                      <>
                        <td className="px-4 py-0.5">
                          {entry.type === 'Dr' && (
                            <input 
                              id={`amount-${idx}`}
                              type="number" 
                              value={entry.amount}
                              onChange={(e) => {
                                const newEntries = [...entries];
                                newEntries[idx].amount = e.target.value;
                                setEntries(newEntries);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'amount')}
                              className="w-full text-right bg-transparent focus:outline-none font-bold font-mono"
                            />
                          )}
                        </td>
                        <td className="px-4 py-0.5">
                          {entry.type === 'Cr' && (
                            <input 
                              id={`amount-${idx}`}
                              type="number" 
                              value={entry.amount}
                              onChange={(e) => {
                                const newEntries = [...entries];
                                newEntries[idx].amount = e.target.value;
                                setEntries(newEntries);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'amount')}
                              className="w-full text-right bg-transparent focus:outline-none font-bold font-mono"
                            />
                          )}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-0.5">
                        <input 
                          id={`amount-${idx}`}
                          type="number" 
                          value={entry.amount}
                          onChange={(e) => {
                            const newEntries = [...entries];
                            newEntries[idx].amount = e.target.value;
                            setEntries(newEntries);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, idx, 'amount')}
                          className="w-full text-right bg-transparent focus:outline-none font-bold font-mono"
                        />
                      </td>
                    )}
                  </tr>
                  
                  {/* Bill-wise Details (only if enabled and ledger selected) */}
                  {config.showBillWise && entry.ledgerId && (
                    <tr className="bg-blue-50/30 text-[10px]">
                      <td></td>
                      <td className="px-4 py-1 flex gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-bold uppercase tracking-tighter">Method:</span>
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
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Ref No:</span>
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
                      <td colSpan={type === 'Journal' || !config.singleEntry ? 2 : 1}></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Configuration Modal (F12) */}
        {showConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-[350px] bg-white border-4 border-tally-teal shadow-2xl p-4">
              <h3 className="text-sm font-bold text-tally-teal border-b-2 border-tally-teal mb-4 uppercase">Configuration</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase">Use Dr/Cr instead of To/By</span>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, useDrCr: !prev.useDrCr }))}
                    className={`px-4 py-1 text-[10px] font-bold uppercase border-2 ${config.useDrCr ? 'bg-tally-teal text-white border-tally-teal' : 'bg-white text-gray-400 border-gray-200'}`}
                  >
                    {config.useDrCr ? 'Yes' : 'No'}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase">Use Single Entry Mode</span>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, singleEntry: !prev.singleEntry }))}
                    className={`px-4 py-1 text-[10px] font-bold uppercase border-2 ${config.singleEntry ? 'bg-tally-teal text-white border-tally-teal' : 'bg-white text-gray-400 border-gray-200'}`}
                  >
                    {config.singleEntry ? 'Yes' : 'No'}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase">Show Bill-wise Details</span>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, showBillWise: !prev.showBillWise }))}
                    className={`px-4 py-1 text-[10px] font-bold uppercase border-2 ${config.showBillWise ? 'bg-tally-teal text-white border-tally-teal' : 'bg-white text-gray-400 border-gray-200'}`}
                  >
                    {config.showBillWise ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowConfig(false)}
                className="w-full mt-6 bg-tally-teal text-white py-2 text-xs font-bold uppercase hover:bg-tally-header"
              >
                Save & Close
              </button>
            </div>
          </div>
        )}

        {/* Totals Bar */}
        <div className="bg-tally-sidebar text-white flex justify-between px-4 py-1 font-bold text-xs uppercase z-10">
          <span>Total</span>
          {type === 'Journal' || !config.singleEntry ? (
            <div className="flex gap-20">
              <span className="w-40 text-right font-mono">₹ {calculateTotal('Dr').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="w-40 text-right font-mono">₹ {calculateTotal('Cr').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <span className="w-40 text-right font-mono">₹ {calculateTotal('Dr').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          )}
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
          { label: 'H: Single Entry', action: () => setConfig(prev => ({ ...prev, singleEntry: !prev.singleEntry })) },
          { label: 'F12:Config', action: () => setShowConfig(true) }
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
