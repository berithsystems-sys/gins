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
  const [gstType, setGstType] = useState('Regular');
  const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [pan, setPan] = useState('');
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
        gstType,
        gstin,
        email,
        pan,
        branchId 
      }),
    });
    if (response.ok) {
      alert('Ledger Created Successfully (ERP/GST Ready)');
      setName('');
      setOpeningBalance('0');
      setGstin('');
      setEmail('');
      setPan('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-tally-bg">
      <div className="bg-tally-sidebar text-white px-4 py-1 font-bold text-xs uppercase flex justify-between">
        <span>Ledger Creation</span>
        <span className="text-tally-accent">Company: {branchId || 'HQ'}</span>
      </div>

      <form onSubmit={handleSubmit} className="p-8 flex-grow">
        <div className="max-w-4xl mx-auto bg-white tally-border tally-shadow p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column: Basic Details */}
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b-2 border-tally-teal focus:bg-tally-accent/10 p-1 font-bold text-sm uppercase outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">(alias)</label>
                <input type="text" className="w-full border-b border-gray-200 focus:bg-tally-accent/10 p-1 text-xs outline-none" />
              </div>

              <div className="pt-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Under</label>
                <select 
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full border-b-2 border-tally-teal focus:bg-tally-accent/10 p-1 font-bold text-sm outline-none"
                >
                  <option value="">Primary</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            {/* Right Column: Statutory & Opening Balance */}
            <div className="space-y-6 border-l border-gray-100 pl-12">
              <div>
                <h3 className="text-[10px] font-bold text-tally-teal border-b mb-4 uppercase">Statutory Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">GST Applicable</label>
                    <span className="text-xs font-bold text-tally-teal">Applicable</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Set/Alter GST Details</label>
                    <span className="text-xs font-bold text-red-700 cursor-pointer">No</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Opening Balance (on 1-Apr-26)</label>
                <div className="flex gap-2 items-end">
                  <input 
                    type="number" 
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="flex-grow border-b-2 border-tally-teal focus:bg-tally-accent/10 p-1 text-right font-mono font-bold text-sm outline-none"
                  />
                  <select 
                    value={balanceType}
                    onChange={(e) => setBalanceType(e.target.value as 'Dr' | 'Cr')}
                    className="w-16 border-b-2 border-tally-teal focus:bg-tally-accent/10 p-1 font-bold text-tally-teal outline-none"
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-12">
            <div className="bg-tally-light tally-border p-4 w-48 text-center tally-shadow">
               <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Accept?</p>
               <div className="flex gap-4 justify-center">
                  <button type="submit" className="bg-tally-teal text-white px-4 py-1 text-xs font-bold uppercase hover:bg-tally-header">Yes</button>
                  <button type="button" onClick={() => window.history.back()} className="bg-gray-200 px-4 py-1 text-xs font-bold uppercase hover:bg-gray-300">No</button>
               </div>
            </div>
          </div>
        </div>
      </form>

      {/* Right Button Bar */}
      <div className="fixed right-0 top-12 bottom-0 w-24 bg-tally-sidebar flex flex-col gap-0.5 p-0.5 text-[10px] text-white">
        {['F2:Date', 'F3:Company', 'F11:Features', 'F12:Configure'].map((btn) => (
          <div key={btn} className="h-10 bg-tally-hotkey flex items-center px-2 cursor-pointer hover:bg-tally-accent hover:text-black">
            {btn}
          </div>
        ))}
      </div>
    </div>
  );
}
