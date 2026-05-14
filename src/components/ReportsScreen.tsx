/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Ledger {
  id: string;
  name: string;
  groupId: string;
  openingBalance: number;
}

interface AccountGroup {
  id: string;
  name: string;
  under?: string;
}

export default function ReportsScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(res => res.json()),
      fetch(`/api/vouchers${query}`).then(res => res.json()),
      fetch(`/api/account-groups${query}`).then(res => res.json())
    ]).then(([l, v, g]) => {
      setLedgers(l);
      setVouchers(v);
      setGroups(g);
    });
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = ledger?.openingBalance || 0;
    
    vouchers.forEach(v => {
      v.entries.forEach((e: any) => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    
    return balance;
  };

  const getGroupTotal = (groupName: string) => {
    const targetGroup = groups.find(g => g.name === groupName);
    if (!targetGroup) return 0;
    
    // Find all subgroups (recursively or just one level for now)
    const subGroupIds = groups.filter(g => g.under === targetGroup.id).map(g => g.id);
    const relevantGroupIds = [targetGroup.id, ...subGroupIds];
    
    const relevantLedgers = ledgers.filter(l => relevantGroupIds.includes(l.groupId));
    return relevantLedgers.reduce((acc, l) => acc + calculateBalance(l.id), 0);
  };

  const renderSection = (title: string, groupNames: string[]) => {
    const sections = groupNames.map(name => ({ name, balance: getGroupTotal(name) }));
    const total = sections.reduce((acc, s) => acc + s.balance, 0);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-2">
          {sections.map(s => (
            <div key={s.name} className="flex justify-between text-[13px] py-1 px-1 hover:bg-tally-bg transition-colors border-b border-gray-100">
              <span className="font-medium">{s.name}</span>
              <span className="font-mono font-bold">{Math.abs(s.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-bold border-t-2 border-tally-teal pt-2 mt-4 px-1 text-tally-teal">
          <span>Total</span>
          <span className="font-mono">{Math.abs(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border-2 border-tally-teal shadow-2xl">
        <div className="bg-tally-teal text-white px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-center border-b-2 border-white/20">
          Balance Sheet
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-tally-teal/10">
          <div className="p-4 bg-gray-50/30">
            <h3 className="text-[10px] font-bold text-red-700 uppercase mb-4 border-b border-red-100 pb-1">Liabilities</h3>
            {renderSection('Liabilities', ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense Account'])}
          </div>
          <div className="p-4 bg-blue-50/10">
            <h3 className="text-[10px] font-bold text-green-700 uppercase mb-4 border-b border-green-100 pb-1">Assets</h3>
            {renderSection('Assets', ['Fixed Assets', 'Investments', 'Current Assets', 'Direct Income'])}
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-red-700 shadow-2xl">
        <div className="bg-red-700 text-white px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-center border-b-2 border-white/20">
          Profit & Loss Account
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-red-700/10">
          <div className="p-4 bg-red-50/10">
            <h3 className="text-[10px] font-bold text-red-700 uppercase mb-4 border-b border-red-100 pb-1">Expenses</h3>
            {renderSection('Expenses', ['Purchase Account', 'Direct Expenses', 'Indirect Expenses'])}
          </div>
          <div className="p-4 bg-green-50/10">
            <h3 className="text-[10px] font-bold text-green-700 uppercase mb-4 border-b border-green-100 pb-1">Income</h3>
            {renderSection('Income', ['Sales Account', 'Direct Income', 'Indirect Income'])}
          </div>
        </div>
      </div>
    </div>
  );
}
