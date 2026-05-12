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

export default function ReportsScreen({ branchId }: { branchId?: string }) {
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-8">
        <div className="border-2 border-tally-teal shadow-md">
          <div className="bg-tally-teal text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-center">Balance Sheet</div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold border-b border-tally-teal/20 pb-1 text-gray-400 uppercase px-1">
              <span>Particulars</span>
              <span>Amount</span>
            </div>
            {ledgers.filter(l => ['Bank Accounts', 'Cash-in-hand', 'Fixed Assets', 'Current Assets', 'Primary'].includes(l.group)).map(l => (
              <div key={l.id} className="flex justify-between text-xs py-1.5 px-1 hover:bg-tally-bg transition-colors">
                <span>{l.name}</span>
                <span className="font-mono font-bold">{calculateBalance(l.id).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-tally-teal shadow-md">
          <div className="bg-tally-teal text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-center">Profit & Loss</div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-xs font-bold border-b border-tally-teal/20 pb-1 text-gray-400 uppercase px-1">
              <span>Particulars</span>
              <span>Amount</span>
            </div>
            {ledgers.filter(l => ['Direct Expenses', 'Indirect Expenses', 'Sales Accounts', 'Purchase Accounts'].includes(l.group)).map(l => (
              <div key={l.id} className="flex justify-between text-xs py-1.5 px-1 hover:bg-tally-bg transition-colors">
                <span>{l.name}</span>
                <span className="font-mono font-bold">{calculateBalance(l.id).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
