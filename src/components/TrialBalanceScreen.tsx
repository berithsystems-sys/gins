/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Ledger {
  id: string;
  name: string;
  group: string;
  openingBalance: number;
}

interface Voucher {
  id: string;
  entries: {
    ledgerId: string;
    amount: number;
    type: 'Dr' | 'Cr';
  }[];
}

export default function TrialBalanceScreen({ branchId }: { branchId?: string }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [drillDownGroup, setDrillDownGroup] = useState<string | null>(null);

  useEffect(() => {
    const query = branchId ? `?branchId=${branchId}` : '';
    Promise.all([
      fetch(`/api/ledgers${query}`).then(res => res.json()),
      fetch(`/api/vouchers${query}`).then(res => res.json())
    ]).then(([l, v]) => {
      setLedgers(l);
      setVouchers(v);
    });
  }, [branchId]);

  const calculateBalance = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    let balance = ledger?.openingBalance || 0;
    
    vouchers.forEach(v => {
      v.entries?.forEach(e => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    
    return balance;
  };

  const getGroups = () => {
    const groups: Record<string, { dr: number; cr: number }> = {};
    ledgers.forEach(l => {
      const bal = calculateBalance(l.id);
      if (!groups[l.group]) groups[l.group] = { dr: 0, cr: 0 };
      if (bal > 0) groups[l.group].dr += bal;
      else groups[l.group].cr += Math.abs(bal);
    });
    return groups;
  };

  const groups = getGroups();
  const drTotal = Object.values(groups).reduce((acc, g) => acc + g.dr, 0);
  const crTotal = Object.values(groups).reduce((acc, g) => acc + g.cr, 0);

  return (
    <div className="space-y-4 w-full">
      <div className="bg-tally-teal text-white p-2 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-between">
        <div className="w-20"></div>
        <span>Trial Balance {drillDownGroup ? `- ${drillDownGroup}` : ''}</span>
        <button 
          onClick={() => setDrillDownGroup(null)}
          className={`text-[10px] bg-white/20 px-2 py-0.5 rounded transition-opacity ${drillDownGroup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          Back to Groups
        </button>
      </div>

      <div className="border border-tally-teal/20 bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead className="bg-gray-50 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-right w-32 md:w-48">Debit</th>
              <th className="px-4 py-2 text-right w-32 md:w-48">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!drillDownGroup ? (
              // Group View
              Object.entries(groups).map(([groupName, totals]) => (
                <tr 
                  key={groupName} 
                  className="hover:bg-tally-accent/10 cursor-pointer transition-colors group"
                  onClick={() => setDrillDownGroup(groupName)}
                >
                  <td className="px-4 py-2 font-bold text-blue-900 group-hover:underline">
                    {groupName}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {totals.dr > 0 ? totals.dr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {totals.cr > 0 ? totals.cr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                  </td>
                </tr>
              ))
            ) : (
              // Ledger View (Drill-down)
              ledgers.filter(l => l.group === drillDownGroup).map(l => {
                const balance = calculateBalance(l.id);
                if (balance === 0) return null;
                return (
                  <tr key={l.id} className="hover:bg-tally-accent/5 transition-colors">
                    <td className="px-4 py-1.5 pl-8 italic">{l.name}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-gray-600">
                      {balance > 1 ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono text-gray-600">
                      {balance < -1 ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-tally-teal/5 border-t-2 border-tally-teal font-extrabold">
            <tr>
              <td className="px-4 py-2 uppercase tracking-tighter">Grand Total</td>
              <td className="px-4 py-2 text-right font-mono border-l border-tally-teal/10">
                {drTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-2 text-right font-mono border-l border-tally-teal/10">
                {crTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-[9px] text-gray-400 italic">
        * Click on any group name to see breakdown by individual ledgers.
      </div>
    </div>
  );
}
