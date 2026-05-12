/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export default function LedgerScreen() {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Primary');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState<'Dr' | 'Cr'>('Dr');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/ledgers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, group, openingBalance: Number(openingBalance), balanceType }),
    });
    if (response.ok) {
      alert('Ledger Created Successfully');
      setName('');
      setOpeningBalance('0');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
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
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase">Under</label>
            <select 
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            >
              <option>Primary</option>
              <option>Bank Accounts</option>
              <option>Cash-in-hand</option>
              <option>Direct Expenses</option>
              <option>Indirect Expenses</option>
              <option>Fixed Assets</option>
              <option>Current Assets</option>
              <option>Sundry Debtors</option>
              <option>Sundry Creditors</option>
              <option>Sales Accounts</option>
              <option>Purchase Accounts</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 border-l pl-8">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Opening Balance</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="flex-1 border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 text-right"
              />
              <select 
                value={balanceType}
                onChange={(e) => setBalanceType(e.target.value as 'Dr' | 'Cr')}
                className="w-16 border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
              >
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-tally-teal/20">
        <button 
          type="submit"
          className="bg-tally-teal text-white px-8 py-2 text-xs font-bold uppercase hover:bg-tally-teal/90 shadow-md"
        >
          Accept
        </button>
      </div>
      <p className="text-[10px] text-gray-400 italic">Press CTRL+A to save, ESC to cancel</p>
    </form>
  );
}
