/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export default function LedgerScreen({ branchId }: { branchId?: string }) {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState<'Dr' | 'Cr'>('Dr');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetch(`api/account-groups${branchId ? `?branchId=${branchId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setGroups(data);
        if (data.length > 0) setGroupId(data[0].id);
      });
  }, [branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('api/ledgers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        groupId, 
        group_name: groups.find(g => g.id === groupId)?.name,
        openingBalance: Number(openingBalance), 
        balanceType, 
        branchId 
      }),
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
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1"
            >
              <option value="">Primary</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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
