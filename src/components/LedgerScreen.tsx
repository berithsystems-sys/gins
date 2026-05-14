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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-tally-teal/50 border-b border-tally-teal/10 pb-1 uppercase tracking-tighter">Identity</h3>
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
              <label className="block text-xs font-bold text-gray-400 uppercase">Under (Parent Group)</label>
              <select 
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-semibold"
              >
                <option value="">Primary</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-tally-teal/50 border-b border-tally-teal/10 pb-1 uppercase tracking-tighter">Taxation & GST</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">GST Type</label>
                <select 
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value)}
                  className="w-full border-b border-gray-300 focus:outline-none p-1 text-xs"
                >
                  <option value="Unregistered">Unregistered</option>
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="Consumer">Consumer</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase">GSTIN/UIN</label>
                <input 
                  type="text" 
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full border-b border-gray-300 focus:outline-none p-1 text-xs font-mono"
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">PAN/IT No.</label>
              <input 
                type="text" 
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full border-b border-gray-300 focus:outline-none p-1 text-xs font-mono"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6 border-l border-tally-teal/5 pl-8">
          <section className="space-y-4">
             <h3 className="text-[10px] font-black text-tally-teal/50 border-b border-tally-teal/10 pb-1 uppercase tracking-tighter">Opening Balance</h3>
             <div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="flex-1 border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 text-right font-mono"
                />
                <select 
                  value={balanceType}
                  onChange={(e) => setBalanceType(e.target.value as 'Dr' | 'Cr')}
                  className="w-16 border-b border-tally-teal focus:outline-none focus:bg-tally-accent/10 p-1 font-bold text-tally-teal"
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-tally-teal/50 border-b border-tally-teal/10 pb-1 uppercase tracking-tighter">Contact Information</h3>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-gray-300 focus:outline-none p-1 text-xs"
                placeholder="accounts@example.com"
              />
            </div>
            <div className="bg-gray-50 p-2 text-[10px] text-gray-400 italic">
               Enable Mailing details in F12 configuration for advanced address fields.
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-tally-teal/20">
        <p className="text-[10px] text-gray-400 italic font-medium">Auto-fill GST details from portal using API key (F11 feature)</p>
        <button 
          type="submit"
          className="bg-tally-teal text-white px-12 py-2 text-xs font-bold uppercase hover:bg-teal-700 shadow-xl transition-all active:scale-95"
        >
          Accept (Enter)
        </button>
      </div>
    </form>
  );
}
