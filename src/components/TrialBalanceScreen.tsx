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
      v.entries.forEach(e => {
        if (e.ledgerId === ledgerId) {
          if (e.type === 'Dr') balance += e.amount;
          else balance -= e.amount;
        }
      });
    });
    
    return balance;
  };

  const drTotal = ledgers.reduce((acc, l) => {
    const bal = calculateBalance(l.id);
    return acc + (bal > 0 ? bal : 0);
  }, 0);

  const crTotal = ledgers.reduce((acc, l) => {
    const bal = calculateBalance(l.id);
    return acc + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="bg-tally-teal text-white p-2 text-center text-xs font-bold uppercase tracking-widest">
        Trial Balance
      </div>

      <div className="border border-tally-teal/20 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-tally-teal/10 font-bold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Particulars</th>
              <th className="px-4 py-2 text-right w-40">Debit</th>
              <th className="px-4 py-2 text-right w-40">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ledgers.map(l => {
              const balance = calculateBalance(l.id);
              if (balance === 0) return null;
              return (
                <tr key={l.id} className="hover:bg-tally-accent/10 transition-colors">
                  <td className="px-4 py-1.5 font-medium">{l.name}</td>
                  <td className="px-4 py-1.5 text-right font-mono">
                    {balance > 0 ? balance.toFixed(2) : ''}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono">
                    {balance < 0 ? Math.abs(balance).toFixed(2) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-tally-teal/5 border-t-2 border-tally-teal font-bold">
            <tr>
              <td className="px-4 py-2 uppercase">Grand Total</td>
              <td className="px-4 py-2 text-right font-mono border-l">{drTotal.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-mono border-l">{crTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
